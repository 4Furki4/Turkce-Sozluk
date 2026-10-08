/** @jest-environment node */
jest.mock("server-only", () => ({}));
jest.mock("@/db", () => ({ db: {} }));
jest.mock("@/src/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
jest.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return {}; } async limit() { return { success: true }; } } }));
jest.mock("superjson", () => ({ __esModule: true, default: { serialize: (value: unknown) => ({ json: value }), deserialize: ({ json }: { json: unknown }) => json } }));

import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { words } from "@/db/schema/words";
import { users } from "@/db/schema/users";
import { relatedWords } from "@/db/schema/related_words";
import { wordRelationSuggestions as suggestions } from "@/db/schema/word_relation_suggestions";
import { wordRelationsAdminRouter } from "../admin/word-relations";
import { acceptWordRelationSuggestion, listWordRelationSuggestions, reviewWordRelationSuggestion, suggestionListInput } from "../admin/word-relation-suggestions";

test.each([null, { user: { role: "user" } }, { user: { role: "moderator" } }])("suggestion procedures deny non-admin sessions %p", async (session) => {
  const caller = wordRelationsAdminRouter.createCaller({ db: {}, session, headers: new Headers() } as never);
  for (const request of [
    () => caller.getSuggestions({}), () => caller.getSuggestionDetails({ id: 1 }),
    () => caller.acceptSuggestion({ id: 1, relationType: "synonym" }),
    () => caller.dismissSuggestion({ id: 1 }), () => caller.restoreSuggestion({ id: 1 }),
  ]) await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("directional types and invalid list limits are rejected", async () => {
  const caller = wordRelationsAdminRouter.createCaller({ db: {}, session: { user: { id: "admin", role: "admin" } }, headers: new Headers() } as never);
  await expect(caller.acceptSuggestion({ id: 1, relationType: "correction" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(caller.getSuggestions({ limit: 51 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

test.each([
  { minScore: 2, maxScore: 1 }, { maxScore: 3.01 }, { minScore: -0.01 },
  { minConfidence: 0.9, maxConfidence: 0.8 }, { minConfidence: -0.01 }, { maxConfidence: 1.01 },
  { sort: "confidence_asc" },
])("invalid sort/range inputs are rejected: %p", async (input) => {
  const caller = wordRelationsAdminRouter.createCaller({ db: {}, session: { user: { id: "admin", role: "admin" } }, headers: new Headers() } as never);
  await expect(caller.getSuggestions(input as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

// Run against an explicitly supplied local database; fixtures are removed afterwards.
const databaseTests = process.env.JEV_TEST_DATABASE_URL ? describe : describe.skip;
databaseTests("word relation suggestions with PostgreSQL", () => {
  const connection = postgres(process.env.JEV_TEST_DATABASE_URL!, { max: 4 });
  const actualDb = drizzle(connection);
  const db = actualDb as unknown as Parameters<typeof acceptWordRelationSuggestion>[0];
  const reviewerId = `word-relation-test-${randomUUID()}`;
  const runKey = reviewerId.padEnd(64, "0").slice(0, 64);
  let wordIds: number[];
  let suggestionIds: number[];

  beforeAll(async () => {
    await actualDb.insert(users).values({ id: reviewerId, email: `${reviewerId}@example.invalid`, role: "admin" });
    wordIds = (await actualDb.insert(words).values([0, 1, 2, 3, 4].map((index) => ({ name: `relation-fixture-${reviewerId}-${index}` }))).returning({ id: words.id })).map((row) => row.id);
  });
  beforeEach(async () => {
    await actualDb.delete(suggestions).where(eq(suggestions.runKey, runKey));
    await actualDb.delete(relatedWords).where(inArray(relatedWords.wordId, wordIds));
    suggestionIds = (await actualDb.insert(suggestions).values([
      { score: 3, confidence: 0.8 }, { score: 3, confidence: 0.9 }, { score: 3, confidence: 0.9 }, { score: 2.5, confidence: 0.99 },
    ].map((score, index) => ({ ...score, runKey, model: "fixture", scoredAt: new Date(), wordId: wordIds[0], relatedWordId: wordIds[index + 1], evidence: [] }))).returning({ id: suggestions.id })).map((row) => row.id);
  });
  afterAll(async () => {
    if (wordIds?.length) await actualDb.delete(words).where(inArray(words.id, wordIds));
    await actualDb.delete(users).where(eq(users.id, reviewerId));
    await connection.end();
  });

  test("ranking and cursor pages preserve score, confidence and stable ID order", async () => {
    const input = suggestionListInput.parse({ wordId: wordIds[0], limit: 2 });
    const first = await listWordRelationSuggestions(db, input);
    expect(first.items.map((item) => item.id)).toEqual([suggestionIds[1], suggestionIds[2]]);
    const second = await listWordRelationSuggestions(db, { ...input, cursor: first.nextCursor });
    expect(second.items.map((item) => item.id)).toEqual([suggestionIds[0], suggestionIds[3]]);
    expect(second.nextCursor).toBeNull();
    const otherSide = await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[1] }));
    expect(otherSide.items.map((item) => item.id)).toEqual([suggestionIds[0]]);
  });
  test("name filtering searches either direction and treats SQL wildcards literally", async () => {
    for (const sort of ["score_desc", "score_asc"] as const) {
      const page = await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0], query: reviewerId, sort }));
      expect(new Set(page.items.map((item) => item.id))).toEqual(new Set(suggestionIds));
      for (const query of ["%", "_", "\\"]) {
        expect((await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0], query, sort }))).items).toEqual([]);
      }
    }
  });
  test("lowest-first pagination includes zero scores and preserves descending confidence ties", async () => {
    await actualDb.update(suggestions).set({ score: 0 }).where(eq(suggestions.id, suggestionIds[3]));
    const input = suggestionListInput.parse({ wordId: wordIds[0], minScore: 0, sort: "score_asc", limit: 1 });
    const seen: number[] = [];
    let cursor: typeof input.cursor = null;
    do {
      const page = await listWordRelationSuggestions(db, { ...input, cursor });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor && seen.length <= suggestionIds.length);
    expect(seen).toEqual([suggestionIds[3], suggestionIds[1], suggestionIds[2], suggestionIds[0]]);
    expect(cursor).toBeNull();
  });
  test("score and confidence ranges are combined with inclusive bounds in either order", async () => {
    for (const sort of ["score_desc", "score_asc"] as const) {
      const input = suggestionListInput.parse({ wordId: wordIds[0], minScore: 2.5, maxScore: 3, minConfidence: 0.9, maxConfidence: 0.99, sort });
      const page = await listWordRelationSuggestions(db, input);
      expect(page.items.map((item) => item.id)).toEqual(sort === "score_asc" ? [suggestionIds[3], suggestionIds[1], suggestionIds[2]] : [suggestionIds[1], suggestionIds[2], suggestionIds[3]]);
      const exact = await listWordRelationSuggestions(db, { ...input, minScore: 3, maxScore: 3, minConfidence: 0.9, maxConfidence: 0.9 });
      expect(exact.items.map((item) => item.id)).toEqual([suggestionIds[1], suggestionIds[2]]);
    }
    await actualDb.update(suggestions).set({ score: 0, confidence: 0 }).where(eq(suggestions.id, suggestionIds[3]));
    const zero = await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0], minScore: 0, maxScore: 0, maxConfidence: 0 }));
    expect(zero.items.map((item) => item.id)).toEqual([suggestionIds[3]]);
    const empty = await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0], minScore: 1, maxScore: 2 }));
    expect(empty).toEqual({ items: [], nextCursor: null });
  });
  test("duplicate simultaneous acceptance creates only two links", async () => {
    await Promise.all([acceptWordRelationSuggestion(db, suggestionIds[0], "synonym", reviewerId), acceptWordRelationSuggestion(db, suggestionIds[0], "synonym", reviewerId)]);
    const links = await actualDb.select().from(relatedWords).where(inArray(relatedWords.wordId, [wordIds[0], wordIds[1]]));
    expect(links).toHaveLength(2);
    expect(links.every((row) => row.relationType === "synonym")).toBe(true);
    expect((await actualDb.select().from(suggestions).where(eq(suggestions.id, suggestionIds[0])))[0].status).toBe("accepted");
  });
  test("a matching existing direction is preserved while the missing direction is added", async () => {
    await actualDb.insert(relatedWords).values({ wordId: wordIds[0], relatedWordId: wordIds[1], relationType: "synonym", createdAt: "2000-01-01", userId: reviewerId });
    await acceptWordRelationSuggestion(db, suggestionIds[0], "synonym", reviewerId);
    const links = await actualDb.select().from(relatedWords).where(inArray(relatedWords.wordId, [wordIds[0], wordIds[1]]));
    expect(links).toHaveLength(2);
    expect(links.find((row) => row.wordId === wordIds[0])!.createdAt).toBe("2000-01-01");
  });
  test("conflicting types are preserved without accepting or adding the reverse", async () => {
    await actualDb.insert(relatedWords).values({ wordId: wordIds[0], relatedWordId: wordIds[1], relationType: "antonym" });
    await expect(acceptWordRelationSuggestion(db, suggestionIds[0], "synonym", reviewerId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await actualDb.select().from(relatedWords).where(inArray(relatedWords.wordId, wordIds))).toHaveLength(1);
    expect((await actualDb.select().from(suggestions).where(eq(suggestions.id, suggestionIds[0])))[0].status).toBe("pending");
  });
  test("an audit failure rolls back both inserted directions", async () => {
    const failingDb = { transaction: (run: (tx: unknown) => Promise<unknown>) => actualDb.transaction((tx) => run(new Proxy(tx, {
      get(target, property) {
        if (property === "update") return () => { throw new Error("audit write failed"); };
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }))) } as unknown as typeof db;
    await expect(acceptWordRelationSuggestion(failingDb, suggestionIds[0], "relatedWord", reviewerId)).rejects.toThrow("audit write failed");
    expect(await actualDb.select().from(relatedWords).where(inArray(relatedWords.wordId, wordIds))).toHaveLength(0);
  });
  test("dismiss and restore survive reload; dismissed pairs cannot be accepted", async () => {
    await reviewWordRelationSuggestion(db, suggestionIds[0], "dismiss", reviewerId);
    await expect(acceptWordRelationSuggestion(db, suggestionIds[0], "relatedWord", reviewerId)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0], status: "dismissed" }))).items).toHaveLength(1);
    await reviewWordRelationSuggestion(db, suggestionIds[0], "restore", reviewerId);
    expect((await listWordRelationSuggestions(db, suggestionListInput.parse({ wordId: wordIds[0] }))).items).toHaveLength(4);
  });
  test("repeat import keeps review fields and does not duplicate pairs", async () => {
    await reviewWordRelationSuggestion(db, suggestionIds[0], "dismiss", reviewerId);
    const [before] = await actualDb.select().from(suggestions).where(eq(suggestions.id, suggestionIds[0]));
    await actualDb.insert(suggestions).values({ runKey, model: "fixture", scoredAt: new Date(), wordId: wordIds[0], relatedWordId: wordIds[1], score: 3, confidence: 0.8, evidence: [] }).onConflictDoNothing();
    const [after] = await actualDb.select().from(suggestions).where(eq(suggestions.id, suggestionIds[0]));
    expect(after).toEqual(before);
    expect(await actualDb.select().from(suggestions).where(eq(suggestions.runKey, runKey))).toHaveLength(4);
  });
  test("self-links fail the database constraint; deleted words remove suggestions", async () => {
    await expect(actualDb.insert(suggestions).values({ runKey, model: "fixture", scoredAt: new Date(), wordId: wordIds[0], relatedWordId: wordIds[0], score: 2, confidence: 0.5, evidence: [] })).rejects.toThrow();
    await actualDb.delete(words).where(eq(words.id, wordIds[4]));
    await expect(acceptWordRelationSuggestion(db, suggestionIds[3], "relatedWord", reviewerId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
