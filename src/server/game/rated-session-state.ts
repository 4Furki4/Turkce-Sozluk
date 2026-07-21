import "server-only";

import type {
    SpeedRoundSessionProgress,
    SpeedRoundSessionSnapshot,
    WordMatchingSessionProgress,
    WordMatchingSessionSnapshot,
} from "@/src/lib/game";
import type { SelectGameSession } from "@/db/schema/game_sessions";
import type { SpeedRoundSnapshot, WordMatchingSnapshot } from "./session-rounds";

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
    return {
        status: session.status,
        currentStep: session.currentStep,
        deadlineAt: session.deadlineAt ?? session.questionStartedAt,
        score: session.score,
        streak: session.streak,
        maxStreak: session.maxStreak,
        correctCount: session.correctCount,
        timeTakenMs: session.elapsedMs,
        completedAt: session.completedAt,
    };
}

export function toWordMatchingProgress(session: SelectGameSession): WordMatchingSessionProgress {
    return {
        status: session.status,
        currentStep: session.currentStep,
        deadlineAt: session.deadlineAt,
        // The router captures the game start with its application clock when
        // it also derives `deadlineAt`; use the same persisted timestamp for
        // elapsed-time scoring instead of a potentially skewed DB default.
        startedAt: session.questionStartedAt,
        score: session.score,
        mistakes: session.mistakeCount,
        matchedWordTokens: session.matchedTokens,
        completedAt: session.completedAt,
    };
}
