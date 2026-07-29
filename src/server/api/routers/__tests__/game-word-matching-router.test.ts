jest.mock("server-only", () => ({}));
jest.mock("superjson", () => ({
    __esModule: true,
    default: {
        serialize: (value: unknown) => ({ json: value }),
        deserialize: ({ json }: { json: unknown }) => json,
    },
}));
jest.mock("@/db", () => ({ db: {} }));
jest.mock("@/src/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
jest.mock("@upstash/ratelimit", () => ({
    Ratelimit: class {
        static slidingWindow() {
            return {};
        }

        async limit() {
            return { success: true };
        }
    },
}));

import { gameScores } from "@/db/schema/game_scores";
import { gameSessionEvents } from "@/db/schema/game_sessions";
import { gameRouter } from "@/src/server/api/routers/game";
import type { WordMatchingSnapshot } from "@/src/server/game/session-rounds";

type InsertRecord = { table: unknown; values: Record<string, unknown> };

function rowsBuilder(rows: unknown[]) {
    const builder = {
        for: () => ({ limit: async () => rows }),
        limit: async () => rows,
        then: (
            resolve: (value: unknown[]) => unknown,
            reject: (reason: unknown) => unknown,
        ) => Promise.resolve(rows).then(resolve, reject),
    };
    return builder;
}

function createTransaction(selectQueue: unknown[][], inserts: InsertRecord[]) {
    return {
        select: jest.fn(() => ({
            from: jest.fn(() => ({
                where: jest.fn(() => rowsBuilder(selectQueue.shift() ?? [])),
            })),
        })),
        update: jest.fn(() => ({
            set: jest.fn(() => ({ where: jest.fn(async () => []) })),
        })),
        insert: jest.fn((table: unknown) => ({
            values: jest.fn(async (values: Record<string, unknown>) => {
                inserts.push({ table, values });
                return [];
            }),
        })),
        execute: jest.fn(async () => [{ rank: 1 }]),
    };
}

function makeSnapshot(): WordMatchingSnapshot {
    const pairs = Array.from({ length: 6 }, (_, index) => ({
        wordToken: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        wordId: index + 1,
        word: `word-${index + 1}`,
        meaningToken: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        meaningId: index + 101,
        meaning: `meaning-${index + 1}`,
    }));

    return {
        kind: "word_matching",
        pairs,
        wordOrder: pairs.map((pair) => pair.wordToken),
        meaningOrder: pairs.map((pair) => pair.meaningToken),
    };
}

function makeSession(
    snapshot: WordMatchingSnapshot,
    now: Date,
    overrides: Record<string, unknown> = {},
) {
    return {
        id: "40000000-0000-4000-8000-000000000001",
        userId: "learner-1",
        gameType: "word_matching",
        status: "active",
        // No activation marker models rows created before the two-phase flow.
        // They must remain playable without being eligible for reactivation.
        settings: { source: "all", pairCount: 6, mode: "timed" },
        snapshot,
        currentStep: 0,
        streak: 0,
        maxStreak: 0,
        score: 0,
        correctCount: 0,
        mistakeCount: 0,
        matchedTokens: [],
        elapsedMs: 0,
        questionStartedAt: new Date(now.getTime() - 50_000),
        deadlineAt: new Date(now.getTime() + 10_000),
        expiresAt: new Date(now.getTime() + 600_000),
        completedAt: null,
        createdAt: new Date(now.getTime() - 50_000),
        updatedAt: new Date(now.getTime() - 50_000),
        ...overrides,
    };
}

function createCaller(db: unknown) {
    return gameRouter.createCaller({
        db,
        session: { user: { id: "learner-1" } },
        headers: new Headers(),
    } as never);
}

describe("Word Matching router terminal idempotency", () => {
    it("stores one authoritative timeout review and replays it unchanged", async () => {
        const now = new Date();
        const snapshot = makeSnapshot();
        const matchedTokens = [snapshot.pairs[0]!.wordToken];
        const ownedSession = makeSession(snapshot, now, {
            currentStep: 1,
            correctCount: 1,
            score: 90,
            mistakeCount: 1,
            matchedTokens,
            deadlineAt: new Date(now.getTime() - 1),
        });
        const selectQueue: unknown[][] = [
            [ownedSession],
            [],
            [{
                payload: {
                    wordTileToken: snapshot.pairs[0]!.wordToken,
                    meaningTileToken: snapshot.pairs[1]!.meaningToken,
                },
            }],
        ];
        const inserts: InsertRecord[] = [];
        const tx = createTransaction(selectQueue, inserts);
        const db = { transaction: async (run: (transaction: typeof tx) => unknown) => run(tx) };
        const caller = createCaller(db);
        const input = {
            sessionId: ownedSession.id,
            actionId: "50000000-0000-4000-8000-000000000001",
            wordTileToken: null,
            meaningTileToken: null,
        };

        const first = await caller.attemptWordMatchingSession(input);
        const storedEvent = inserts.find((record) => record.table === gameSessionEvents);
        selectQueue.push([ownedSession], [{ outcome: storedEvent!.values.outcome }]);
        const replay = await caller.attemptWordMatchingSession(input);

        expect(first).toEqual(replay);
        expect(first).toMatchObject({
            expired: true,
            score: 90,
            mistakes: 1,
            matchedWordTokens: matchedTokens,
        });
        expect(first.review).toEqual([
            expect.objectContaining({ wordId: 1, matched: true, mistakeCount: 1 }),
            expect.objectContaining({ wordId: 2, matched: false, mistakeCount: 1 }),
            ...snapshot.pairs.slice(2).map((pair) => expect.objectContaining({
                wordId: pair.wordId,
                matched: false,
                mistakeCount: 0,
            })),
        ]);
        expect(inserts.filter((record) => record.table === gameSessionEvents)).toHaveLength(1);
        expect(inserts.filter((record) => record.table === gameScores)).toHaveLength(0);
    });

    it("inserts one verified score and replays the same completed outcome", async () => {
        const now = new Date();
        const snapshot = makeSnapshot();
        const matchedTokens = snapshot.pairs.slice(0, 5).map((pair) => pair.wordToken);
        const ownedSession = makeSession(snapshot, now, {
            currentStep: 5,
            correctCount: 5,
            score: 500,
            matchedTokens,
        });
        const selectQueue: unknown[][] = [[ownedSession], [], []];
        const inserts: InsertRecord[] = [];
        const tx = createTransaction(selectQueue, inserts);
        const db = { transaction: async (run: (transaction: typeof tx) => unknown) => run(tx) };
        const caller = createCaller(db);
        const finalPair = snapshot.pairs[5]!;
        const input = {
            sessionId: ownedSession.id,
            actionId: "50000000-0000-4000-8000-000000000002",
            wordTileToken: finalPair.wordToken,
            meaningTileToken: finalPair.meaningToken,
        };

        const first = await caller.attemptWordMatchingSession(input);
        const storedEvent = inserts.find((record) => record.table === gameSessionEvents);
        selectQueue.push([ownedSession], [{ outcome: storedEvent!.values.outcome }]);
        const replay = await caller.attemptWordMatchingSession(input);

        expect(first).toEqual(replay);
        expect(first).toMatchObject({
            expired: false,
            completed: true,
            score: 600,
            mistakes: 0,
            rank: 1,
        });
        expect(first.review).toHaveLength(6);
        expect(first.review?.every((pair) => pair.matched && pair.mistakeCount === 0)).toBe(true);
        expect(inserts.filter((record) => record.table === gameScores)).toHaveLength(1);
        expect(inserts.filter((record) => record.table === gameSessionEvents)).toHaveLength(1);
    });
});
