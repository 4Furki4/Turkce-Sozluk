export const FLASHCARD_RATINGS = ["again", "hard", "good", "easy"] as const;

export type FlashcardRating = (typeof FLASHCARD_RATINGS)[number];

export const FLASHCARD_SCHEDULING = {
    againMinutes: 10,
    firstIntervals: {
        hard: 1,
        good: 3,
        easy: 7,
    },
    defaultEaseFactor: 250,
    minimumEaseFactor: 130,
    maximumEaseFactor: 300,
    maximumIntervalDays: 365,
} as const;

export type FlashcardReviewSchedulingState = {
    repetitions: number;
    lapses: number;
    easeFactor: number;
    intervalDays: number;
};

export type FlashcardReviewSchedule = FlashcardReviewSchedulingState & {
    dueAt: Date;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
// PostgreSQL's `integer` columns store signed 32-bit values.
const MAX_REVIEW_COUNTER = 2_147_483_647;

function clampInteger(value: number, minimum: number, maximum: number): number {
    if (!Number.isFinite(value)) return minimum;
    return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function addMinutes(now: Date, minutes: number): Date {
    return new Date(now.getTime() + minutes * MINUTE_MS);
}

function addDays(now: Date, days: number): Date {
    return new Date(now.getTime() + days * DAY_MS);
}

function incrementCounter(value: number): number {
    return Math.min(MAX_REVIEW_COUNTER, value + 1);
}

/**
 * Derive a review schedule entirely from the persisted state and a server
 * timestamp. The browser never supplies a due date, interval, or ease value.
 */
export function scheduleFlashcardReview(
    previous: FlashcardReviewSchedulingState | null,
    rating: FlashcardRating,
    now: Date,
): FlashcardReviewSchedule {
    const repetitions = clampInteger(previous?.repetitions ?? 0, 0, MAX_REVIEW_COUNTER);
    const lapses = clampInteger(previous?.lapses ?? 0, 0, MAX_REVIEW_COUNTER);
    const intervalDays = clampInteger(
        previous?.intervalDays ?? 0,
        0,
        FLASHCARD_SCHEDULING.maximumIntervalDays,
    );
    const easeFactor = clampInteger(
        previous?.easeFactor ?? FLASHCARD_SCHEDULING.defaultEaseFactor,
        FLASHCARD_SCHEDULING.minimumEaseFactor,
        FLASHCARD_SCHEDULING.maximumEaseFactor,
    );

    if (rating === "again") {
        return {
            repetitions: 0,
            lapses: incrementCounter(lapses),
            easeFactor: Math.max(FLASHCARD_SCHEDULING.minimumEaseFactor, easeFactor - 20),
            intervalDays: 0,
            dueAt: addMinutes(now, FLASHCARD_SCHEDULING.againMinutes),
        };
    }

    if (rating === "hard") {
        const nextInterval = intervalDays === 0
            ? FLASHCARD_SCHEDULING.firstIntervals.hard
            : Math.max(1, Math.ceil(intervalDays * 1.2));

        return {
            repetitions: incrementCounter(repetitions),
            lapses,
            easeFactor: Math.max(FLASHCARD_SCHEDULING.minimumEaseFactor, easeFactor - 15),
            intervalDays: clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays),
            dueAt: addDays(now, clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays)),
        };
    }

    if (rating === "good") {
        const nextInterval = intervalDays === 0
            ? FLASHCARD_SCHEDULING.firstIntervals.good
            : Math.max(3, Math.round(intervalDays * (easeFactor / 100)));

        return {
            repetitions: incrementCounter(repetitions),
            lapses,
            easeFactor,
            intervalDays: clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays),
            dueAt: addDays(now, clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays)),
        };
    }

    const nextEaseFactor = Math.min(FLASHCARD_SCHEDULING.maximumEaseFactor, easeFactor + 15);
    const nextInterval = intervalDays === 0
        ? FLASHCARD_SCHEDULING.firstIntervals.easy
        : Math.max(7, Math.round(intervalDays * ((nextEaseFactor / 100) + 0.5)));

    return {
        repetitions: incrementCounter(repetitions),
        lapses,
        easeFactor: nextEaseFactor,
        intervalDays: clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays),
        dueAt: addDays(now, clampInteger(nextInterval, 1, FLASHCARD_SCHEDULING.maximumIntervalDays)),
    };
}
