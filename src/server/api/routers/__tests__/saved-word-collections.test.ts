/** @jest-environment node */
jest.mock("server-only", () => ({}));
jest.mock("@/db", () => ({ db: {} }));
jest.mock("@/src/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
jest.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return {}; } async limit() { return { success: true }; } } }));
jest.mock("superjson", () => ({ __esModule: true, default: { serialize: (value: unknown) => ({ json: value }), deserialize: ({ json }: { json: unknown }) => json } }));

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { savedWordCollectionMembers, savedWordCollections } from "@/db/schema/saved_word_collections";
import { savedWords } from "@/db/schema/saved_words";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { roots } from "@/db/schema/roots";
import { userRouter } from "../user";
import { findWordDataById, findWordDataByName } from "@/src/server/word-queries";

const collectionId = "50000000-0000-4000-8000-000000000001";

test("all collection and explicit save procedures require authentication", async () => {
  const caller = userRouter.createCaller({ db: {}, session: null, headers: new Headers() } as never);
  for (const request of [
    () => caller.getSavedWordCollections(),
    () => caller.createSavedWordCollection({ name: "Reading" }),
    () => caller.renameSavedWordCollection({ collectionId, name: "Books" }),
    () => caller.deleteSavedWordCollection({ collectionId }),
    () => caller.updateSavedWordCollection({ collectionId, wordIds: [1], action: "add" }),
    () => caller.setWordSaved({ wordId: 1, saved: false }),
    () => caller.restoreSavedWord({ wordId: 1, savedAt: new Date().toISOString(), collectionIds: [] }),
  ]) await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("collection and pagination validation rejects malformed or unbounded inputs", async () => {
  const caller = userRouter.createCaller({ db: {}, session: { user: { id: "owner" } }, headers: new Headers() } as never);
  for (const request of [
    () => caller.createSavedWordCollection({ name: "   " }),
    () => caller.createSavedWordCollection({ name: "a".repeat(81) }),
    () => caller.renameSavedWordCollection({ collectionId: "not-an-id", name: "Books" }),
    () => caller.updateSavedWordCollection({ collectionId, wordIds: [], action: "add" }),
    () => caller.updateSavedWordCollection({ collectionId, wordIds: [0], action: "add" }),
    () => caller.updateSavedWordCollection({ collectionId, wordIds: Array.from({ length: 101 }, (_, i) => i + 1), action: "add" }),
    () => caller.getSavedWords({ take: 101 }),
    () => caller.getSavedWords({ skip: -1 }),
    () => caller.restoreSavedWord({ wordId: 1, savedAt: "bad-date", collectionIds: [] }),
  ]) await expect(request()).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

// Integration is opt-in and accepts only the disposable CI database.
const testDatabaseUrl = process.env.SAVED_WORDS_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const target = new URL(testDatabaseUrl);
  if (target.hostname !== "127.0.0.1" || target.port !== "54329" || target.pathname !== "/turkish_dictionary_ci") {
    throw new Error("Saved Words integration tests require the disposable loopback CI database.");
  }
}
const databaseTests = testDatabaseUrl ? describe : describe.skip;
databaseTests("saved word collections with PostgreSQL", () => {
  const connection = postgres(testDatabaseUrl!, { max: 4 });
  const db = drizzle(connection);
  const ownerId = `saved-owner-${randomUUID()}`;
  const otherId = `saved-other-${randomUUID()}`;
  const userIds = [ownerId, otherId];
  const savedAt = "2026-10-21T10:00:00.123456Z";
  let wordIds: number[] = [];
  const makeCaller = (userId: string) => userRouter.createCaller({ db, session: { user: { id: userId } }, headers: new Headers() } as never);
  const owner = makeCaller(ownerId);
  const other = makeCaller(otherId);

  beforeAll(async () => {
    await db.insert(users).values(userIds.map((id) => ({ id, email: `${id}@example.invalid`, role: "user" as const })));
    wordIds = (await db.insert(words).values(["a", "a", "b"].map((suffix, i) => ({ name: `saved-${ownerId}-${suffix}`, variant: i })))
      .returning({ id: words.id })).map((word) => word.id);
    await db.insert(meanings).values(wordIds.map((wordId) => ({ wordId, meaning: `Definition ${wordId}`, order: 1 })));
    // Multiple roots must never duplicate a library item or break pagination.
    await db.insert(roots).values([{ wordId: wordIds[0]!, root: "first" }, { wordId: wordIds[0]!, root: "second" }]);
  });
  beforeEach(async () => {
    await db.delete(savedWordCollections).where(inArray(savedWordCollections.userId, userIds));
    await db.delete(savedWords).where(inArray(savedWords.userId, userIds));
    await db.insert(savedWords).values(wordIds.map((wordId) => ({ userId: ownerId, wordId, createdAt: savedAt })));
  });
  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, userIds));
    if (wordIds.length) await db.delete(words).where(inArray(words.id, wordIds));
    await connection.end();
  });

  test("keeps collections private and enforces the same owner in both membership foreign keys", async () => {
    const collection = await owner.createSavedWordCollection({ name: " Books " });
    expect(collection.name).toBe("Books");
    expect(await other.getSavedWordCollections()).toEqual([]);
    await expect(other.renameSavedWordCollection({ collectionId: collection.id, name: "Changed" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(other.deleteSavedWordCollection({ collectionId: collection.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(other.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!], action: "add" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.insert(savedWords).values({ userId: otherId, wordId: wordIds[0]! });
    await expect(db.insert(savedWordCollectionMembers).values({ collectionId: collection.id, userId: otherId, wordId: wordIds[0]! })).rejects.toBeDefined();
    expect(await other.getSavedWords({ collectionId: collection.id })).toEqual([]);
    expect(await other.getSavedWordCount({ collectionId: collection.id })).toBe(0);
  });

  test("counts unique memberships, filters lists and counts, and returns collection labels", async () => {
    const collection = await owner.createSavedWordCollection({ name: "Books" });
    await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!, wordIds[1]!, wordIds[0]!], action: "add" });
    await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!], action: "add" });
    const result = await owner.getSavedWords({ collectionId: collection.id });
    expect(result).toHaveLength(2);
    expect(result[0]!.word_data.collections).toEqual([{ id: collection.id, name: "Books" }]);
    expect(await owner.getSavedWordCount({ collectionId: collection.id })).toBe(2);
    expect(await owner.getSavedWordCollections()).toEqual([{ id: collection.id, name: "Books", wordCount: 2 }]);
    expect(await owner.getSavedWords({ collectionId: collection.id, search: "does-not-exist" })).toEqual([]);
    expect(await owner.getSavedWordCount({ collectionId: collection.id, search: "does-not-exist" })).toBe(0);
  });

  test("removing membership or deleting a collection leaves the saved words intact", async () => {
    const collection = await owner.createSavedWordCollection({ name: "Books" });
    await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!, wordIds[1]!], action: "add" });
    await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!], action: "remove" });
    expect(await owner.getSavedWordCount({ collectionId: collection.id })).toBe(1);
    expect(await owner.getSavedWordCount({})).toBe(3);
    await owner.deleteSavedWordCollection({ collectionId: collection.id });
    expect(await owner.getSavedWordCount({})).toBe(3);
    expect(await db.select().from(savedWordCollectionMembers).where(eq(savedWordCollectionMembers.userId, ownerId))).toEqual([]);
  });

  test("bulk results identify only changed memberships so Undo cannot add a word that was never removed", async () => {
    const collection = await owner.createSavedWordCollection({ name: "Books" });
    const added = await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: wordIds.slice(0, 2), action: "add" });
    expect(added.wordIds.sort()).toEqual(wordIds.slice(0, 2).sort());
    expect((await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: wordIds.slice(0, 2), action: "add" })).wordIds).toEqual([]);
    const removed = await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!, wordIds[2]!], action: "remove" });
    expect(removed.wordIds).toEqual([wordIds[0]!]);
    await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: removed.wordIds, action: "add" });
    const members = await db.select({ id: savedWordCollectionMembers.wordId }).from(savedWordCollectionMembers)
      .where(eq(savedWordCollectionMembers.collectionId, collection.id));
    expect(members.map((member) => member.id).sort()).toEqual(wordIds.slice(0, 2).sort());
  });

  test("rejects unsaved words atomically and prevents duplicate collection names per owner", async () => {
    const collection = await owner.createSavedWordCollection({ name: "Books" });
    await expect(owner.createSavedWordCollection({ name: "Books" })).rejects.toMatchObject({ code: "CONFLICT" });
    const second = await owner.createSavedWordCollection({ name: "Second" });
    await expect(owner.renameSavedWordCollection({ collectionId: second.id, name: "Books" })).rejects.toMatchObject({ code: "CONFLICT" });
    await other.createSavedWordCollection({ name: "Books" });
    await owner.setWordSaved({ wordId: wordIds[2]!, saved: false });
    await expect(owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!, wordIds[2]!], action: "add" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await owner.getSavedWordCount({ collectionId: collection.id })).toBe(0);
  });

  test("explicit unsave and restore are idempotent and preserve date and surviving memberships", async () => {
    const keep = await owner.createSavedWordCollection({ name: "Keep" });
    const deleted = await owner.createSavedWordCollection({ name: "Delete" });
    const foreign = await other.createSavedWordCollection({ name: "Foreign" });
    for (const collection of [keep, deleted]) await owner.updateSavedWordCollection({ collectionId: collection.id, wordIds: [wordIds[0]!], action: "add" });
    const before = await db.select().from(savedWords).where(and(eq(savedWords.userId, ownerId), eq(savedWords.wordId, wordIds[0]!)));
    const result = await owner.setWordSaved({ wordId: wordIds[0]!, saved: false });
    expect(result.saved).toBe(false);
    expect(result.snapshot!.collectionIds.sort()).toEqual([keep.id, deleted.id].sort());
    expect((await owner.setWordSaved({ wordId: wordIds[0]!, saved: false })).saved).toBe(false);
    expect(await owner.getSavedWordCount({ collectionId: keep.id })).toBe(0);
    await owner.deleteSavedWordCollection({ collectionId: deleted.id });
    const restoreInput = { wordId: wordIds[0]!, ...result.snapshot!, collectionIds: [...result.snapshot!.collectionIds, foreign.id] };
    await owner.restoreSavedWord(restoreInput);
    await owner.restoreSavedWord(restoreInput);
    const after = await db.select().from(savedWords).where(and(eq(savedWords.userId, ownerId), eq(savedWords.wordId, wordIds[0]!)));
    expect(after[0]!.createdAt).toBe(before[0]!.createdAt);
    expect(await owner.getSavedWordCount({ collectionId: keep.id })).toBe(1);
    expect(await other.getSavedWordCount({ collectionId: foreign.id })).toBe(0);
  });

  test("Undo restores every membership even when a word belongs to more than a thousand collections", async () => {
    const collections = await db.insert(savedWordCollections)
      .values(Array.from({ length: 1001 }, (_, index) => ({ userId: ownerId, name: `Collection ${index}` })))
      .returning({ id: savedWordCollections.id });
    await db.insert(savedWordCollectionMembers).values(collections.map(({ id }) => ({
      userId: ownerId, wordId: wordIds[0]!, collectionId: id,
    })));
    const removed = await owner.setWordSaved({ wordId: wordIds[0]!, saved: false });
    expect(removed.snapshot!.collectionIds).toHaveLength(1001);
    await owner.restoreSavedWord({ wordId: wordIds[0]!, ...removed.snapshot! });
    const restored = await db.select().from(savedWordCollectionMembers)
      .where(and(eq(savedWordCollectionMembers.userId, ownerId), eq(savedWordCollectionMembers.wordId, wordIds[0]!)));
    expect(restored).toHaveLength(1001);
  });

  test("uses a stable ID tie-break and never duplicates words with multiple roots", async () => {
    const input = { sortBy: "alphabet" as const, sortAlphabet: "az" as const, take: 1 };
    const first = await owner.getSavedWords(input);
    const second = await owner.getSavedWords({ ...input, skip: 1 });
    const third = await owner.getSavedWords({ ...input, skip: 2 });
    expect([first[0]!.word_data.word_id, second[0]!.word_data.word_id, third[0]!.word_data.word_id]).toEqual(wordIds);
    expect(first[0]!.word_data.root.root).toBe("first");
  });

  test("an exact saved-word preview reads the selected homograph rather than the preferred name match", async () => {
    const named = await findWordDataByName(db as never, `saved-${ownerId}-a`);
    expect(named[0]!.word_data.word_id).toBe(wordIds[0]);
    const exact = await findWordDataById(db as never, wordIds[1]!);
    expect(exact[0]!.word_data.word_id).toBe(wordIds[1]);
    expect(exact[0]!.word_data.meanings[0]!.meaning).toBe(`Definition ${wordIds[1]}`);
  });

  test("legacy saveWord remains a toggle while explicit save remains idempotent", async () => {
    expect(await owner.saveWord({ wordId: wordIds[0]! })).toBe(false);
    expect(await owner.saveWord({ wordId: wordIds[0]! })).toBe(true);
    await owner.setWordSaved({ wordId: wordIds[0]!, saved: true });
    await owner.setWordSaved({ wordId: wordIds[0]!, saved: true });
    expect(await owner.getSavedWordCount({})).toBe(3);
    await expect(owner.saveWord({ wordId: 2_000_000_000 })).rejects.toBeDefined();
    expect(await owner.getSavedWordCount({})).toBe(3);
  });
});
