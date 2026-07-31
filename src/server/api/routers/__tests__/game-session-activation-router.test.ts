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

import { gameRouter } from "@/src/server/api/routers/game";

function rowsBuilder(getRows: () => unknown[]) {
    return {
        for: () => ({ limit: async () => getRows() }),
        limit: async () => getRows(),
        then: (
            resolve: (value: unknown[]) => unknown,
            reject: (reason: unknown) => unknown,
        ) => Promise.resolve(getRows()).then(resolve, reject),
    };
}

function preparedSession(gameType: "speed_round" | "word_matching") {
    const now = new Date();
    return {
        id: gameType === "speed_round"
            ? "40000000-0000-4000-8000-000000000001"
            : "40000000-0000-4000-8000-000000000002",
        userId: "learner-1",
        gameType,
        status: "active",
        settings: gameType === "speed_round"
            ? { source: "all", questionCount: 10, timePerQuestion: 10, activationState: "pending" }
            : { source: "all", pairCount: 6, mode: "relaxed", activationState: "pending" },
        snapshot: gameType === "speed_round"
            ? { kind: "speed_round", questions: [] }
            : { kind: "word_matching", pairs: [], wordOrder: [], meaningOrder: [] },
        currentStep: 0,
        streak: 0,
        maxStreak: 0,
        score: 0,
        correctCount: 0,
        mistakeCount: 0,
        matchedTokens: [],
        elapsedMs: 0,
        questionStartedAt: now,
        deadlineAt: null,
        expiresAt: new Date(now.getTime() + 600_000),
        completedAt: null,
        createdAt: now,
        updatedAt: now,
    };
}

function createStatefulDb(initialSession: ReturnType<typeof preparedSession>) {
    let storedSession: Record<string, unknown> = initialSession;
    const updates: Record<string, unknown>[] = [];
    const inserts: Record<string, unknown>[] = [];

    const db = {
        transaction: async (run: (tx: unknown) => unknown) => {
            let selectCount = 0;
            let transactionSession = storedSession;
            const transactionUpdates: Record<string, unknown>[] = [];
            const transactionInserts: Record<string, unknown>[] = [];
            const result = await run({
                select: jest.fn(() => ({
                    from: jest.fn(() => ({
                        where: jest.fn(() => rowsBuilder(() => selectCount++ === 0 ? [transactionSession] : [])),
                    })),
                })),
                update: jest.fn(() => ({
                    set: jest.fn((values: Record<string, unknown>) => ({
                        where: jest.fn(async () => {
                            transactionUpdates.push(values);
                            transactionSession = { ...transactionSession, ...values };
                            return [];
                        }),
                    })),
                })),
                insert: jest.fn(() => ({
                    values: jest.fn(async (values: Record<string, unknown>) => {
                        transactionInserts.push(values);
                        return [];
                    }),
                })),
            });
            // Mirror transaction commit semantics: a thrown callback skips
            // these assignments, so rollback-sensitive tests can catch it.
            storedSession = transactionSession;
            updates.push(...transactionUpdates);
            inserts.push(...transactionInserts);
            return result;
        },
    };

    return { db, getStoredSession: () => storedSession, updates, inserts };
}

function createCaller(db: unknown) {
    return gameRouter.createCaller({
        db,
        session: { user: { id: "learner-1" } },
        headers: new Headers(),
    } as never);
}

describe("rated game session activation", () => {
    it("starts Speed Round once and an activation retry cannot extend its deadline", async () => {
        const state = createStatefulDb(preparedSession("speed_round"));
        const caller = createCaller(state.db);
        const input = { sessionId: "40000000-0000-4000-8000-000000000001" };

        const first = await caller.activateGameSession(input);
        const replay = await caller.activateGameSession(input);

        expect(new Date(first.deadlineAt!).getTime() - new Date(first.activatedAt).getTime()).toBe(10_000);
        expect(replay.activatedAt).toBe(first.activatedAt);
        expect(replay.deadlineAt).toBe(first.deadlineAt);
        expect(state.updates).toHaveLength(1);
        expect(state.getStoredSession()).toMatchObject({
            settings: expect.objectContaining({
                activationState: "active",
                activatedAt: first.activatedAt,
            }),
            questionStartedAt: new Date(first.activatedAt),
            deadlineAt: new Date(first.deadlineAt!),
        });
    });

    it("activates relaxed Word Matching without a deadline and refreshes its start", async () => {
        const state = createStatefulDb(preparedSession("word_matching"));
        const caller = createCaller(state.db);

        const outcome = await caller.activateGameSession({
            sessionId: "40000000-0000-4000-8000-000000000002",
        });

        expect(outcome.deadlineAt).toBeNull();
        expect(Number.isNaN(new Date(outcome.activatedAt).getTime())).toBe(false);
        expect(state.getStoredSession()).toMatchObject({
            settings: expect.objectContaining({
                activationState: "active",
                activatedAt: outcome.activatedAt,
            }),
            questionStartedAt: new Date(outcome.activatedAt),
            deadlineAt: null,
        });
    });

    it("gives timed Word Matching its full server-owned minute on activation", async () => {
        const initial = preparedSession("word_matching");
        initial.settings = { ...initial.settings, mode: "timed" };
        const state = createStatefulDb(initial);
        const caller = createCaller(state.db);

        const outcome = await caller.activateGameSession({
            sessionId: "40000000-0000-4000-8000-000000000002",
        });

        expect(new Date(outcome.deadlineAt!).getTime() - new Date(outcome.activatedAt).getTime()).toBe(60_000);
    });

    it("does not reset a legacy session that was already timed at creation", async () => {
        const initial = preparedSession("speed_round");
        initial.settings = { source: "all", questionCount: 10, timePerQuestion: 10 };
        initial.deadlineAt = new Date(Date.now() + 5_000);
        const originalDeadline = initial.deadlineAt;
        const state = createStatefulDb(initial);
        const caller = createCaller(state.db);

        await expect(caller.activateGameSession({ sessionId: initial.id }))
            .rejects.toThrow("Game session session_already_active");
        expect(state.updates).toHaveLength(0);
        expect(state.getStoredSession().deadlineAt).toBe(originalDeadline);
    });

    it("persists an expired prepared session before returning session_expired", async () => {
        const initial = preparedSession("speed_round");
        initial.expiresAt = new Date(Date.now() - 1_000);
        const state = createStatefulDb(initial);
        const caller = createCaller(state.db);

        await expect(caller.activateGameSession({ sessionId: initial.id }))
            .rejects.toThrow("Game session session_expired");
        expect(state.updates).toHaveLength(1);
        expect(state.getStoredSession()).toMatchObject({
            status: "expired",
            completedAt: expect.any(Date),
        });
    });

    it("rejects an invalid persisted Word Matching mode without starting a clock", async () => {
        const initial = preparedSession("word_matching");
        initial.settings = {
            ...initial.settings,
            mode: "invalid",
        } as never;
        const state = createStatefulDb(initial);
        const caller = createCaller(state.db);

        await expect(caller.activateGameSession({ sessionId: initial.id }))
            .rejects.toThrow("Game session invalid_session_state");
        expect(state.updates).toHaveLength(0);
    });

    it.each([
        ["speed_round", "answerSpeedRoundSession", {
            sessionId: "40000000-0000-4000-8000-000000000001",
            actionId: "50000000-0000-4000-8000-000000000001",
            questionIndex: 0,
            optionToken: "60000000-0000-4000-8000-000000000001",
            timeout: false,
        }],
        ["word_matching", "attemptWordMatchingSession", {
            sessionId: "40000000-0000-4000-8000-000000000002",
            actionId: "50000000-0000-4000-8000-000000000002",
            wordTileToken: "60000000-0000-4000-8000-000000000002",
            meaningTileToken: "70000000-0000-4000-8000-000000000002",
        }],
    ] as const)("rejects a %s action before activation without recording an event", async (
        gameType,
        procedure,
        input,
    ) => {
        const state = createStatefulDb(preparedSession(gameType));
        const caller = createCaller(state.db);

        await expect((caller[procedure] as (value: typeof input) => Promise<unknown>)(input))
            .rejects.toThrow("Game session session_not_ready");
        expect(state.inserts).toHaveLength(0);
        expect(state.updates).toHaveLength(0);
    });
});
