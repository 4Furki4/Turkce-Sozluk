import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { etymologyEntries, etymologySources } from "../../db/schema/etymology";

const lineSchema = z.object({
  baseLineIndex: z.number().int().nonnegative(),
  column: z.enum(["left", "right"]),
  baseText: z.string().min(1),
  alternatives: z.array(z.object({
    script: z.string(),
    lang: z.string(),
    ocrVersion: z.string(),
    candidates: z.array(z.object({ text: z.string(), score: z.number() })),
  })),
  qwenSuggestions: z.array(z.object({
    model: z.string().min(1),
    text: z.string().trim().min(1),
    crop: z.tuple([
      z.number().int().nonnegative(), z.number().int().nonnegative(),
      z.number().int().positive(), z.number().int().positive(),
    ]),
    reviewStatus: z.literal("needs_review"),
  })).default([]),
});

const combinedSchema = z.object({
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pdfPage: z.number().int().positive(),
  printedPage: z.number().int().positive(),
  reviewState: z.literal("unverified_ocr"),
  bodyLines: z.array(lineSchema).min(1),
});

const boundariesSchema = z.object({
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pdfPage: z.number().int().positive(),
  printedPage: z.number().int().positive(),
  entries: z.array(z.object({
    sourceEntryKey: z.string().min(1),
    headword: z.string().min(1),
    column: z.enum(["left", "right"]),
    firstLineIndex: z.number().int().nonnegative(),
    kind: z.enum(["article", "cross_reference"]),
  })).min(1),
});

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const combinedPath = option("--combined");
  const boundariesPath = option("--boundaries");
  const write = process.argv.includes("--write");
  if (!combinedPath || !boundariesPath || (write && !process.env.DATABASE_URL)) {
    throw new Error("Usage: bun src/scripts/import-etymology-ocr.ts --combined <combined.json> --boundaries <entry-boundaries.json> [--write]; --write requires DATABASE_URL");
  }

  const combined = combinedSchema.parse(JSON.parse(await readFile(resolve(combinedPath), "utf8")));
  const boundaries = boundariesSchema.parse(JSON.parse(await readFile(resolve(boundariesPath), "utf8")));
  if (combined.documentSha256 !== boundaries.documentSha256
    || combined.pdfPage !== boundaries.pdfPage
    || combined.printedPage !== boundaries.printedPage) {
    throw new Error("The OCR output and entry boundaries identify different source pages");
  }
  const keys = boundaries.entries.map((entry) => entry.sourceEntryKey);
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate sourceEntryKey in entry boundaries");

  const entries = boundaries.entries.flatMap((entry, index) => {
    const columnLines = combined.bodyLines.filter((line) => line.column === entry.column);
    const start = columnLines.findIndex((line) => line.baseLineIndex === entry.firstLineIndex);
    if (start < 0) throw new Error(`Missing first OCR line for ${entry.sourceEntryKey}`);
    const next = boundaries.entries.slice(index + 1).find((candidate) => candidate.column === entry.column);
    const end = next ? columnLines.findIndex((line) => line.baseLineIndex === next.firstLineIndex) : columnLines.length;
    if (end <= start) throw new Error(`Invalid line boundaries for ${entry.sourceEntryKey}`);
    const lines = columnLines.slice(start, end);
    if (!lines[0].baseText.startsWith(`${entry.headword} `)) {
      throw new Error(`OCR headword mismatch for ${entry.sourceEntryKey}: ${lines[0].baseText}`);
    }
    const position = boundaries.entries.filter((candidate) => candidate.column === entry.column).findIndex((candidate) => candidate.sourceEntryKey === entry.sourceEntryKey) + 1;
    const ocrText = lines.flatMap((line) => [
      line.baseText,
      ...line.alternatives.flatMap((alternative) => {
        const suggestions = alternative.candidates.filter((candidate) => /[\u0370-\u03ff\u1f00-\u1fff]/u.test(candidate.text));
        return suggestions.map((candidate) =>
          `⟦${alternative.script} OCR ${alternative.ocrVersion}, unverified: ${candidate.text}⟧`);
      }),
      ...line.qwenSuggestions.map(({ model, text, crop }) =>
        `⟦Qwen OCR ${model}, unverified, crop ${crop.join(", ")}: ${text}⟧`),
    ]).join("\n");
    return [{ ...entry, ocrText, lineCount: lines.length, sourceLocator: `${entry.column} column, entry ${position}` }];
  });
  const covered = entries.reduce((sum, entry) => sum + entry.lineCount, 0);
  if (covered !== combined.bodyLines.length) {
    throw new Error(`Entry boundaries cover ${covered} of ${combined.bodyLines.length} body lines`);
  }
  console.log(JSON.stringify({
    mode: write ? "write" : "dry-run",
    pdfPage: combined.pdfPage,
    printedPage: combined.printedPage,
    entries: entries.map(({ sourceEntryKey, headword, lineCount }) => ({ sourceEntryKey, headword, lineCount })),
  }, null, 2));
  if (!write) return;

  const url = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/turkish_dictionary_etymology") {
    throw new Error("OCR drafts can only be written to the dedicated Mac-local etymology database");
  }
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      const [source] = await tx.select().from(etymologySources)
        .where(eq(etymologySources.documentSha256, combined.documentSha256));
      if (!source) throw new Error("Source is absent from the local etymology database");
      for (const entry of entries) {
        const [existing] = await tx.select().from(etymologyEntries)
          .where(and(eq(etymologyEntries.sourceId, source.id), eq(etymologyEntries.sourceEntryKey, entry.sourceEntryKey)))
          .for("update");
        if (existing) {
          if (existing.headword !== entry.headword || existing.kind !== entry.kind) {
            throw new Error(`Existing entry identity differs for ${entry.sourceEntryKey}`);
          }
          if (existing.ocrText === entry.ocrText) continue;
          if (existing.transcriptionStatus === "verified" && existing.ocrText) {
            throw new Error(`Refusing to replace OCR text attached to verified entry ${entry.sourceEntryKey}`);
          }
          await tx.update(etymologyEntries).set({ ocrText: entry.ocrText })
            .where(eq(etymologyEntries.id, existing.id));
        } else {
          await tx.insert(etymologyEntries).values({
            sourceId: source.id,
            sourceEntryKey: entry.sourceEntryKey,
            headword: entry.headword,
            kind: entry.kind,
            printedPageStart: combined.printedPage,
            pdfPageStart: combined.pdfPage,
            sourceLocator: entry.sourceLocator,
            ocrText: entry.ocrText,
            transcriptionStatus: "ocr",
          });
        }
      }
    });
    console.log(`Stored OCR for ${entries.length} source entries. Existing corrected text, claims, and dictionary words were not changed.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
