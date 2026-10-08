import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../../src/env.mjs";
import { schema } from "../../db";
import { appRouter } from "../../src/server/api/root";
import { findWordDataByName } from "../../src/server/word-queries";

const url = new URL(env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Loopback database required");
const samples = Number(process.env.PERF_QUERY_SAMPLES ?? 100);
if (!Number.isInteger(samples) || samples < 10 || samples > 1000) throw new Error("Use 10–1000 samples");
const connection = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 5 });
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const cases: [string, string, unknown][] = [
  ["word kitap", "word.getWord", { name: "kitap", skipLogging: true }],
  ["word gelmek", "word.getWord", { name: "gelmek", skipLogging: true }],
  ["word su", "word.getWord", { name: "su", skipLogging: true }],
  ["word missing", "word.getWord", { name: "zzcodexmissingzz", skipLogging: true }],
  ["list first", "word.getWords", { take: 25, skip: 0 }],
  ["list deep", "word.getWords", { take: 25, skip: 50000 }],
  ["list search", "word.getWords", { take: 25, skip: 0, search: "kitap" }],
  ["list newest", "word.getWords", { take: 25, skip: 0, sortBy: "date", sortOrder: "desc" }],
  ["autocomplete broad", "search.getWords", { query: "ka" }],
  ["verb roots", "search.searchVerbRoots", { query: "gel", limit: 8 }],
  ["relations desc", "admin.wordRelations.getSuggestions", { sort: "score_desc" }],
  ["relations asc", "admin.wordRelations.getSuggestions", { sort: "score_asc" }],
  ["relations search", "admin.wordRelations.getSuggestions", { query: "kitap" }],
  ["dashboard", "admin.overview.getDashboardOverview", undefined],
  ["flashcards", "game.getRandomWordsForFlashcards", { count: 10, source: "all" }],
  ["matching", "game.getWordsForMatching", { pairCount: 6, source: "all" }],
  ["daily word", "word.getWordOfTheDay", undefined],
  ["popular all", "word.getPopularWords", { limit: 5, period: "allTime" }],
  ["popular recent", "word.getPopularWords", { limit: 5, period: "last7Days" }],
  ["version", "word.getAutocompleteListVersion", undefined],
  ["all names", "word.getAllWordNames", undefined],
];
const results: unknown[] = [];
const procedures = appRouter._def.procedures as unknown as Record<string, any>;
try {
  await connection.begin("read only", async (tx) => {
    await tx`SET LOCAL statement_timeout = '5s'`;
    await tx`SET LOCAL lock_timeout = '1s'`;
    let captures: { query: string; params: unknown[] }[] = [];
    const database = drizzle(Object.assign(tx, { options: connection.options }), {
      schema,
      logger: { logQuery(query, params) { captures.push({ query, params }); } },
    });
    for (const [name, path, input] of cases) {
      const procedure = procedures[path] as any;
      if (!procedure) throw new Error(`Unknown procedure: ${path}`);
      let parsed = input;
      for (const parser of procedure._def.inputs) parsed = await parser.parseAsync(parsed);
      const run = () => path === "word.getWord"
        ? findWordDataByName(database as any, (parsed as { name: string }).name)
        : procedure._def.resolver({ input: parsed, ctx: { db: database, session: null, headers: new Headers() } });
      captures = [];
      const data = await run();
      const queries = [...captures];
      captures = [];
      const times: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = performance.now();
        await run();
        times.push(performance.now() - start);
      }
      const plans = [];
      for (const capture of queries) {
        if (!/^\s*(SELECT|WITH)/i.test(capture.query)) throw new Error("Non-read query encountered");
        const plan = (await tx.unsafe("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + capture.query, capture.params as any))[0]["QUERY PLAN"][0];
        plans.push({ query: capture.query, params: capture.params, plan });
      }
      const result = { name, path, samples, p50Ms: percentile(times, .5), p95Ms: percentile(times, .95), sqlCount: queries.length, responseBytes: Buffer.byteLength(JSON.stringify(data)), plans };
      results.push(result);
      console.log(JSON.stringify({ ...result, plans: undefined }));
    }
  });
  const inventory = Object.entries(procedures).filter(([, procedure]) => procedure._def.type === "query").map(([path]) => ({ path, measured: cases.some(([, measured]) => measured === path), boundary: "uncached resolver; no auth/rate limiter/HTTP" }));
  const indexes = await connection`SELECT indexrelname, pg_relation_size(indexrelid)::bigint AS bytes FROM pg_stat_user_indexes WHERE indexrelname IN ('meanings_word_id_id_idx','examples_meaning_id_idx','roots_word_id_idx','words_name_id_idx','words_created_at_name_id_idx','word_relation_suggestions_ascending_rank_idx')`;
  writeFileSync(process.env.PERF_QUERY_OUTPUT ?? "/tmp/turkish-query-resolvers.json", JSON.stringify({ measuredAt: new Date().toISOString(), boundary: "loopback PostgreSQL, read-only transaction, pure uncached resolvers", results, inventory, indexes }, null, 2));
} finally {
  await connection.end();
  await (globalThis as unknown as { conn?: postgres.Sql }).conn?.end();
}
