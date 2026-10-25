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
import { flashcardReviewStates } from "@/db/schema/flashcard_reviews";
import { savedWordCollectionMembers, savedWordCollections } from "@/db/schema/saved_word_collections";
import { savedWords } from "@/db/schema/saved_words";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { gameRouter } from "../game";

test("flashcard collection input validates UUIDs without querying a database", async () => {
    const caller = gameRouter.createCaller({ db: {}, session: { user: { id: "owner" } }, headers: new Headers() } as never);
    for (const request of [
        () => caller.getRandomWordsForFlashcards({ count: 10, source: "saved", collectionId: "invalid" }),
        () => caller.getFlashcardReviewSummary({ collectionId: "invalid" }),
        () => caller.getDueFlashcardReviews({ limit: 10, collectionId: "invalid" }),
    ]) await expect(request()).rejects.toMatchObject({ code: "BAD_REQUEST" });
});

test("anonymous callers cannot read private collection decks or review queues", async () => {
    const caller = gameRouter.createCaller({ db: {}, session: null, headers: new Headers() } as never);
    const collectionId = "50000000-0000-4000-8000-000000000001";
    expect(await caller.getRandomWordsForFlashcards({ count: 10, source: "all", collectionId }))
        .toEqual({ words: [], error: "authRequired" });
    await expect(caller.getFlashcardReviewSummary({ collectionId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.getDueFlashcardReviews({ limit: 10, collectionId })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

const testDatabaseUrl = process.env.SAVED_WORDS_TEST_DATABASE_URL;
if (testDatabaseUrl) {
    const target = new URL(testDatabaseUrl);
    if (target.hostname !== "127.0.0.1" || target.port !== "54329" || target.pathname !== "/turkish_dictionary_ci") {
        throw new Error("Flashcard collection integration tests require the disposable loopback CI database.");
    }
}
const databaseTests = testDatabaseUrl ? describe : describe.skip;

databaseTests("collection-scoped flashcards with PostgreSQL", () => {
    const connection = postgres(testDatabaseUrl!, { max: 4 });
    const db = drizzle(connection);
    const ownerId = `flashcard-owner-${randomUUID()}`;
    const otherId = `flashcard-other-${randomUUID()}`;
    const userIds = [ownerId, otherId];
    const makeCaller = (userId: string) => gameRouter.createCaller({ db, session: { user: { id: userId } }, headers: new Headers() } as never);
    const owner = makeCaller(ownerId);
    let wordIds: number[] = [];
    let meaningIds: number[] = [];
    let collectionId: string;
    let secondCollectionId: string;
    let foreignCollectionId: string;
    let emptyCollectionId: string;

    beforeAll(async () => {
        await db.insert(users).values(userIds.map((id) => ({ id, email: `${id}@example.invalid`, role: "user" as const })));
        wordIds = (await db.insert(words).values([0, 1, 2].map((index) => ({ name: `${ownerId}-${index}`, variant: 0 })))
            .returning({ id: words.id })).map((word) => word.id);
        meaningIds = (await db.insert(meanings).values([
            { wordId: wordIds[0]!, meaning: "First meaning", order: 1 },
            { wordId: wordIds[0]!, meaning: "Second meaning", order: 2 },
            { wordId: wordIds[1]!, meaning: "Saved word meaning", order: 1 },
            { wordId: wordIds[2]!, meaning: "Unsaved word meaning", order: 1 },
        ]).returning({ id: meanings.id })).map((meaning) => meaning.id);
    });

    beforeEach(async () => {
        await db.delete(flashcardReviewStates).where(inArray(flashcardReviewStates.userId, userIds));
        await db.delete(savedWordCollections).where(inArray(savedWordCollections.userId, userIds));
        await db.delete(savedWords).where(inArray(savedWords.userId, userIds));
        await db.insert(savedWords).values([
            { userId: ownerId, wordId: wordIds[0]! },
            { userId: ownerId, wordId: wordIds[1]! },
            { userId: otherId, wordId: wordIds[2]! },
        ]);
        const collections = await db.insert(savedWordCollections).values([
            { userId: ownerId, name: "Reading" },
            { userId: ownerId, name: "Overlapping" },
            { userId: otherId, name: "Private" },
            { userId: ownerId, name: "Empty" },
        ]).returning({ id: savedWordCollections.id });
        [collectionId, secondCollectionId, foreignCollectionId, emptyCollectionId] = collections.map((collection) => collection.id) as [string, string, string, string];
        await db.insert(savedWordCollectionMembers).values([
            { collectionId, userId: ownerId, wordId: wordIds[0]! },
            { collectionId: secondCollectionId, userId: ownerId, wordId: wordIds[0]! },
            { collectionId: secondCollectionId, userId: ownerId, wordId: wordIds[1]! },
            { collectionId: foreignCollectionId, userId: otherId, wordId: wordIds[2]! },
        ]);
        const past = new Date(Date.now() - 60_000);
        const future = new Date(Date.now() + 86_400_000);
        await db.insert(flashcardReviewStates).values(meaningIds.map((meaningId, index) => ({
            userId: ownerId,
            meaningId,
            direction: index === 1 ? "meaning" as const : "word" as const,
            dueAt: index === 2 ? future : past,
            lastReviewedAt: past,
        })));
    });

    afterAll(async () => {
        await db.delete(users).where(inArray(users.id, userIds));
        if (wordIds.length) await db.delete(words).where(inArray(words.id, wordIds));
        await connection.end();
    });

    test("owned collection decks contain only member words and one first meaning per word", async () => {
        const deck = await owner.getRandomWordsForFlashcards({ count: 10, source: "saved", collectionId });
        expect(deck.error).toBeNull();
        expect(deck.words).toEqual([expect.objectContaining({ id: wordIds[0], meaningId: meaningIds[0], meaning: "First meaning" })]);
        const allSaved = await owner.getRandomWordsForFlashcards({ count: 10, source: "saved" });
        expect(allSaved.words.map((word) => word.id).sort()).toEqual(wordIds.slice(0, 2).sort());
        const implicitSaved = await owner.getRandomWordsForFlashcards({ count: 10, source: "all", collectionId });
        expect(implicitSaved.words.map((word) => word.id)).toEqual([wordIds[0]]);
    });

    test("missing and foreign collections never fall back to an account-wide deck or queue", async () => {
        for (const inaccessibleId of [foreignCollectionId, randomUUID()]) {
            await expect(owner.getRandomWordsForFlashcards({ count: 10, source: "saved", collectionId: inaccessibleId })).rejects.toMatchObject({ code: "NOT_FOUND" });
            await expect(owner.getFlashcardReviewSummary({ collectionId: inaccessibleId })).rejects.toMatchObject({ code: "NOT_FOUND" });
            await expect(owner.getDueFlashcardReviews({ limit: 10, collectionId: inaccessibleId })).rejects.toMatchObject({ code: "NOT_FOUND" });
        }
    });

    test("scopes counts, next review date, exact meaning and direction while the default queue retains unsaved history", async () => {
        expect(await owner.getFlashcardReviewSummary()).toMatchObject({ totalCount: 4, dueCount: 3, nextDueAt: expect.any(Date) });
        expect(await owner.getFlashcardReviewSummary({ source: "saved" })).toMatchObject({ totalCount: 3, dueCount: 2 });
        expect(await owner.getFlashcardReviewSummary({ collectionId })).toEqual({ totalCount: 2, dueCount: 2, nextDueAt: null });
        const due = await owner.getDueFlashcardReviews({ limit: 10, source: "saved", collectionId });
        expect(due.totalDueCount).toBe(2);
        expect(due.cards.map((card) => ({ meaningId: card.meaningId, direction: card.direction }))).toEqual([
            { meaningId: meaningIds[0], direction: "word" },
            { meaningId: meaningIds[1], direction: "meaning" },
        ]);
        expect((await owner.getDueFlashcardReviews({ limit: 10 })).cards.map((card) => card.meaningId)).toContain(meaningIds[3]);
    });

    test("an empty collection stays empty instead of drawing another saved word", async () => {
        expect(await owner.getRandomWordsForFlashcards({ count: 10, source: "saved", collectionId: emptyCollectionId }))
            .toEqual({ words: [], error: "noCollectionWords" });
        expect(await owner.getFlashcardReviewSummary({ collectionId: emptyCollectionId })).toEqual({ totalCount: 0, dueCount: 0, nextDueAt: null });
        expect(await owner.getDueFlashcardReviews({ limit: 10, collectionId: emptyCollectionId })).toEqual({ cards: [], totalDueCount: 0 });
    });

    test("ratings update the shared schedule across overlapping collections without creating duplicate review state", async () => {
        const input = { meaningId: meaningIds[0]!, direction: "word" as const, rating: "good" as const, actionId: randomUUID() };
        const result = await owner.rateFlashcardReview(input);
        const replay = await owner.rateFlashcardReview(input);
        expect(replay).toEqual(result);
        expect((await owner.getFlashcardReviewSummary({ collectionId })).dueCount).toBe(1);
        expect((await owner.getFlashcardReviewSummary({ collectionId: secondCollectionId })).dueCount).toBe(1);
        const states = await db.select().from(flashcardReviewStates).where(eq(flashcardReviewStates.userId, ownerId));
        expect(states).toHaveLength(4);
        expect(states.filter((state) => state.meaningId === meaningIds[0] && state.direction === "word")).toHaveLength(1);
    });

    test("unsaving removes collection practice membership while preserving global review history", async () => {
        await db.delete(savedWords).where(and(eq(savedWords.userId, ownerId), eq(savedWords.wordId, wordIds[0]!)));
        expect((await owner.getFlashcardReviewSummary({ collectionId })).totalCount).toBe(0);
        expect((await owner.getFlashcardReviewSummary({ source: "saved" })).totalCount).toBe(1);
        expect((await owner.getFlashcardReviewSummary()).totalCount).toBe(4);
    });
});
