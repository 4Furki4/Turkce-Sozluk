import "server-only";

import type {
    SpeedRoundSessionProgress,
    SpeedRoundSessionSnapshot,
    WordMatchingSessionProgress,
    WordMatchingSessionSnapshot,
} from "@/src/lib/game";
import type { SelectGameSession } from "@/db/schema/game_sessions";
import type { SpeedRoundSnapshot, WordMatchingSnapshot } from "./session-rounds";

function getSessionStartedAt(session: SelectGameSession): Date {
    if (session.settings.activationState === "pending") {
        throw new Error("Prepared game session is not activated");
    }
    // Rows created before two-phase activation have no state marker. They
    // remain playable from their original persisted start timestamp.
    if (session.settings.activationState === undefined) {
        return session.questionStartedAt;
    }

    const activatedAt = session.settings.activatedAt;
    if (!activatedAt) {
        throw new Error("Activated game session has no activation timestamp");
    }

    const parsed = new Date(activatedAt);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Game session activation timestamp is invalid");
    }

    return parsed;
}

export function toSpeedRoundSessionSnapshot(
    snapshot: SpeedRoundSnapshot,
    timePerQuestionSeconds: number,
): SpeedRoundSessionSnapshot {
    return {
        gameType: "speed_round",
        timePerQuestionSeconds,
        questions: snapshot.questions.map((question) => ({
            token: question.token,
            word: question.word,
            correctOptionToken: question.correctOptionToken,
            options: question.options.map((option) => ({
                token: option.token,
                text: option.meaning,
            })),
        })),
    };
}

export function toWordMatchingSessionSnapshot(
    snapshot: WordMatchingSnapshot,
    timeLimitSeconds: number | null,
): WordMatchingSessionSnapshot {
    return {
        gameType: "word_matching",
        timeLimitSeconds,
        pairs: snapshot.pairs.map((pair) => ({
            wordToken: pair.wordToken,
            meaningToken: pair.meaningToken,
            word: pair.word,
            meaning: pair.meaning,
        })),
    };
}

export function toSpeedRoundProgress(session: SelectGameSession): SpeedRoundSessionProgress {
    getSessionStartedAt(session);
    if (!session.deadlineAt) {
        throw new Error("Activated Speed Round session has no deadline");
    }

    return {
        status: session.status,
        currentStep: session.currentStep,
        deadlineAt: session.deadlineAt,
        score: session.score,
        streak: session.streak,
        maxStreak: session.maxStreak,
        correctCount: session.correctCount,
        timeTakenMs: session.elapsedMs,
        completedAt: session.completedAt,
    };
}

export function toWordMatchingProgress(session: SelectGameSession): WordMatchingSessionProgress {
    const startedAt = getSessionStartedAt(session);

    return {
        status: session.status,
        currentStep: session.currentStep,
        deadlineAt: session.deadlineAt,
        startedAt,
        score: session.score,
        mistakes: session.mistakeCount,
        matchedWordTokens: session.matchedTokens,
        completedAt: session.completedAt,
    };
}
