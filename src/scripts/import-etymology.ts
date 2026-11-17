import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq, and, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import {
  etymologyAbbreviations,
  etymologyClaims,
  etymologyEntries,
  etymologySources,
} from "../../db/schema/etymology";

const claimSchema = z.object({
  kind: z.enum(["origin", "derivation", "attested_form", "comparison", "loan_out", "cross_reference", "unknown_origin", "commentary"]),
  stance: z.enum(["asserted", "proposed", "disputed", "rejected", "unknown"]),
  summary: z.string().min(1),
  senseLabel: z.string().optional(),
  sourceForm: z.string().optional(),
  sourceLanguageLabel: z.string().optional(),
  targetForm: z.string().optional(),
  targetLanguageLabel: z.string().optional(),
  attributedTo: z.string().optional(),
  referenceText: z.string().optional(),
  evidenceText: z.string().optional(),
});

const importSchema = z.object({
  source: z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    edition: z.string().optional(),
    publicationYear: z.number().int().optional(),
    documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  abbreviations: z.array(z.object({
    code: z.string().min(1),
    kind: z.enum(["language", "dialect", "publication", "other"]),
    expansion: z.string().min(1),
  })).default([]),
  entries: z.array(z.object({
    sourceEntryKey: z.string().min(1),
    headword: z.string().min(1),
    gloss: z.string().optional(),
    kind: z.enum(["article", "cross_reference"]),
    printedPageStart: z.number().int().positive(),
    printedPageEnd: z.number().int().positive().optional(),
    pdfPageStart: z.number().int().positive(),
    pdfPageEnd: z.number().int().positive().optional(),
    sourceLocator: z.string().optional(),
    correctedText: z.string().min(1),
    claims: z.array(claimSchema).min(1),
  })).min(1),
});

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const file = option("--file");
  const pdf = option("--pdf");
  const write = process.argv.includes("--write");
  if (!file || !pdf || (write && !process.env.DATABASE_URL)) {
    throw new Error("Usage: bun src/scripts/import-etymology.ts --file <reviewed.json> --pdf <source.pdf> [--write]; --write requires DATABASE_URL");
  }

  const data = importSchema.parse(JSON.parse(await readFile(resolve(file), "utf8")));
  const keys = data.entries.map((entry) => entry.sourceEntryKey);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate sourceEntryKey in input");
  const documentSha256 = createHash("sha256").update(await readFile(resolve(pdf))).digest("hex");
  if (documentSha256 !== data.source.documentSha256) throw new Error("PDF hash does not match the reviewed source");
  console.log(JSON.stringify({
    mode: write ? "write" : "dry-run",
    source: data.source.title,
    documentSha256,
    abbreviations: data.abbreviations.length,
    entries: data.entries.map(({ sourceEntryKey, headword, claims }) => ({ sourceEntryKey, headword, claims: claims.length })),
  }, null, 2));
  if (!write) return;

  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/turkish_dictionary_etymology") {
    throw new Error("This pilot importer only writes to the dedicated Mac-local turkish_dictionary_etymology database");
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      const [existingSource] = await tx.select().from(etymologySources)
        .where(eq(etymologySources.documentSha256, documentSha256));
      const [source] = existingSource ? [existingSource] : await tx.insert(etymologySources)
        .values({ ...data.source, documentSha256 })
        .returning();

      for (const abbreviation of data.abbreviations) {
        await tx.insert(etymologyAbbreviations)
          .values({ ...abbreviation, sourceId: source.id })
          .onConflictDoUpdate({
            target: [etymologyAbbreviations.sourceId, etymologyAbbreviations.code, etymologyAbbreviations.kind],
            set: { expansion: abbreviation.expansion },
          });
      }

      for (const entry of data.entries) {
        const [existingEntry] = await tx.select().from(etymologyEntries)
          .where(and(eq(etymologyEntries.sourceId, source.id), eq(etymologyEntries.sourceEntryKey, entry.sourceEntryKey)));
        if (existingEntry) {
          const reviewed = await tx.select({ id: etymologyClaims.id }).from(etymologyClaims)
            .where(and(eq(etymologyClaims.entryId, existingEntry.id), ne(etymologyClaims.reviewStatus, "candidate")));
          if (reviewed.length) throw new Error(`Cannot replace reviewed claims for ${entry.sourceEntryKey}`);
        }
        const { claims, ...entryData } = entry;
        const [savedEntry] = existingEntry
          ? await tx.update(etymologyEntries).set({ ...entryData, transcriptionStatus: "verified" })
            .where(eq(etymologyEntries.id, existingEntry.id)).returning()
          : await tx.insert(etymologyEntries)
            .values({ ...entryData, sourceId: source.id, transcriptionStatus: "verified" }).returning();
        await tx.delete(etymologyClaims).where(eq(etymologyClaims.entryId, savedEntry.id));
        await tx.insert(etymologyClaims).values(claims.map((claim) => ({ ...claim, entryId: savedEntry.id })));
      }
    });
    console.log(`Imported ${data.entries.length} reviewed entries. Dictionary words and roots were not changed.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
