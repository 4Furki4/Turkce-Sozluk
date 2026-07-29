jest.mock("server-only", () => ({}));

import type { SelectGameSession } from "@/db/schema/game_sessions";
import {
    toSpeedRoundProgress,
    toWordMatchingProgress,
} from "@/src/server/game/rated-session-state";

function makeSession(overrides: Partial<SelectGameSession> = {}): SelectGameSession {
    const now = new Date("2026-07-29T12:00:00.000Z");
    return {
        id: "40000000-0000-4000-8000-000000000001",
        userId: "learner-1",
        gameType: "speed_round",
        status: "active",
        settings: { source: "all", questionCount: 10, timePerQuestion: 10 },
        snapshot: { kind: "speed_round", questions: [] },
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
        ...overrides,
    };
}

describe("rated session activated progress", () => {
    it("does not silently treat a prepared Speed Round as playable", () => {
        expect(() => toSpeedRoundProgress(makeSession({
            settings: {
                source: "all",
                questionCount: 10,
                timePerQuestion: 10,
                activationState: "pending",
            },
        }))).toThrow("not activated");
    });

    it("keeps legacy Speed Round progress compatible with its persisted deadline", () => {
        const deadlineAt = new Date("2026-07-29T12:00:10.000Z");
        const progress = toSpeedRoundProgress(makeSession({ deadlineAt }));

        expect(progress.deadlineAt).toEqual(deadlineAt);
    });

    it("uses the durable activation marker for relaxed Word Matching elapsed time", () => {
        const activatedAt = "2026-07-29T12:04:00.000Z";
        const progress = toWordMatchingProgress(makeSession({
            gameType: "word_matching",
            settings: {
                source: "all",
                pairCount: 6,
                mode: "relaxed",
                activationState: "active",
                activatedAt,
            },
            snapshot: { kind: "word_matching", pairs: [], wordOrder: [], meaningOrder: [] },
            questionStartedAt: new Date("2026-07-29T12:03:59.000Z"),
        }));

        expect(progress.startedAt).toEqual(new Date(activatedAt));
        expect(progress.deadlineAt).toBeNull();
    });
});
