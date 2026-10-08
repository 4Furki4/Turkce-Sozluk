import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { words } from "../../db/schema/words";
import { wordRelationSuggestions } from "../../db/schema/word_relation_suggestions";
import { mergeScoredPair, scoredBatchSchema, validateWordIdentities, type ImportedSuggestion } from "../lib/word-relation-suggestions";

config({ path: ".env.development.local", quiet: true });
config({ path: ".env.local", quiet: true });

async function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: {
    file: { type: "string", default: "jev/output/all-words.ndjson" },
    "status-file": { type: "string", default: "jev/output/all-words-status.json" },
    write: { type: "boolean", default: false },
  } });
  const status = z.object({
    runKey: z.string().regex(/^[a-f0-9]{64}$/), updatedAt: z.string().datetime(),
    scoredPairs: z.number().int().positive(), inputTokens: z.number().int().nonnegative(),
  }).parse(JSON.parse(await readFile(values["status-file"]!, "utf8")));
  const pairs = new Map<string, ImportedSuggestion>();
  const identities = new Map<number, string>();
  let directedScores = 0;
  let inputTokens = 0;
  const lines = createInterface({ input: createReadStream(values.file!), crlfDelay: Infinity });
  for await (const line of lines) {
    const batch = scoredBatchSchema.parse(JSON.parse(line));
    if (batch.runKey !== status.runKey) throw new Error("Mixed run identifiers; import stopped before writing.");
    inputTokens += batch.inputTokens;
    for (const pair of batch.results) {
      for (const [id, name] of [[pair.sourceWordId, pair.sourceWord], [pair.candidateWordId, pair.candidateWord]] as const) {
        if (identities.has(id) && identities.get(id) !== name) throw new Error(`Inconsistent saved identity for ID ${id}`);
        identities.set(id, name);
      }
      mergeScoredPair(pairs, pair, batch.model);
      directedScores++;
    }
  }
  if (directedScores !== status.scoredPairs || inputTokens !== status.inputTokens) {
    throw new Error("Saved output does not match the run status; import stopped before writing.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const target = new URL(process.env.DATABASE_URL);
  console.log(`Target: ${target.hostname}:${target.port || "5432"}${target.pathname}`);
  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);
  try {
    const current = new Map((await db.select({ id: words.id, name: words.name }).from(words)).map((word) => [word.id, word.name]));
    const missing = validateWordIdentities(identities, current);
    const eligible = [...pairs.values()].filter((pair) => !missing.has(pair.wordId) && !missing.has(pair.relatedWordId))
      .sort((a, b) => a.wordId - b.wordId || a.relatedWordId - b.relatedWordId);
    console.log(JSON.stringify({ directedScores, distinctPairs: pairs.size, missingWordIds: [...missing], eligiblePairs: eligible.length }));
    if (!values.write) {
      console.log("Validation passed. Use --write to import suggestions.");
      return;
    }
    let inserted = 0;
    // A failed batch rolls back the entire import. Existing reviews are never updated.
    await db.transaction(async (tx) => {
      for (let offset = 0; offset < eligible.length; offset += 200) {
        const rows = eligible.slice(offset, offset + 200).map((pair) => ({
          ...pair, runKey: status.runKey, scoredAt: new Date(status.updatedAt),
          model: [...new Set(pair.evidence.map((item) => item.model))].join(", "),
        }));
        inserted += (await tx.insert(wordRelationSuggestions).values(rows).onConflictDoNothing({
          target: [wordRelationSuggestions.runKey, wordRelationSuggestions.wordId, wordRelationSuggestions.relatedWordId],
        }).returning({ id: wordRelationSuggestions.id })).length;
        if (offset % 20000 === 0) console.log(`Processed ${Math.min(offset + 200, eligible.length)} / ${eligible.length} pairs`);
      }
    });
    console.log(JSON.stringify({ inserted, alreadyImported: eligible.length - inserted, skippedPairs: pairs.size - eligible.length }));
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Suggestion import failed");
  process.exitCode = 1;
});
