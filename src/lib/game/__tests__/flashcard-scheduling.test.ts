import {
    FLASHCARD_SCHEDULING,
    scheduleFlashcardReview,
} from "../flashcard-scheduling";

const NOW = new Date("2026-07-21T12:00:00.000Z");

describe("flashcard review scheduling", () => {
    it.each([
        ["again", 0, 1, 230, 0, "2026-07-21T12:10:00.000Z"],
        ["hard", 1, 0, 235, 1, "2026-07-22T12:00:00.000Z"],
        ["good", 1, 0, 250, 3, "2026-07-24T12:00:00.000Z"],
        ["easy", 1, 0, 265, 7, "2026-07-28T12:00:00.000Z"],
    ] as const)("uses the published first-review schedule for %s", (
        rating,
        repetitions,
        lapses,
        easeFactor,
        intervalDays,
        dueAt,
    ) => {
        expect(scheduleFlashcardReview(null, rating, NOW)).toMatchObject({
            repetitions,
            lapses,
            easeFactor,
            intervalDays,
            dueAt: new Date(dueAt),
        });
    });

    it("grows later intervals from the stored interval and bounded ease", () => {
        const current = {
            repetitions: 4,
            lapses: 1,
            easeFactor: 250,
            intervalDays: 8,
        };

        expect(scheduleFlashcardReview(current, "hard", NOW)).toMatchObject({
            repetitions: 5,
            lapses: 1,
            easeFactor: 235,
            intervalDays: 10,
            dueAt: new Date("2026-07-31T12:00:00.000Z"),
        });
        expect(scheduleFlashcardReview(current, "good", NOW)).toMatchObject({
            repetitions: 5,
            lapses: 1,
            easeFactor: 250,
            intervalDays: 20,
            dueAt: new Date("2026-08-10T12:00:00.000Z"),
        });
        expect(scheduleFlashcardReview(current, "easy", NOW)).toMatchObject({
            repetitions: 5,
            lapses: 1,
            easeFactor: 265,
            intervalDays: 25,
            dueAt: new Date("2026-08-15T12:00:00.000Z"),
        });
    });

    it("bounds corrupt or extreme persisted values before scheduling", () => {
        const scheduled = scheduleFlashcardReview({
            repetitions: -4,
            lapses: Number.POSITIVE_INFINITY,
            easeFactor: 99_999,
            intervalDays: 99_999,
        }, "easy", NOW);

        expect(scheduled).toMatchObject({
            repetitions: 1,
            lapses: 0,
            easeFactor: FLASHCARD_SCHEDULING.maximumEaseFactor,
            intervalDays: FLASHCARD_SCHEDULING.maximumIntervalDays,
            dueAt: new Date("2027-07-21T12:00:00.000Z"),
        });
    });

    it("resets a lapse to the short Again interval without mutating its input", () => {
        const current = {
            repetitions: 3,
            lapses: 2,
            easeFactor: 140,
            intervalDays: 21,
        };

        expect(scheduleFlashcardReview(current, "again", NOW)).toMatchObject({
            repetitions: 0,
            lapses: 3,
            easeFactor: FLASHCARD_SCHEDULING.minimumEaseFactor,
            intervalDays: 0,
            dueAt: new Date("2026-07-21T12:10:00.000Z"),
        });
        expect(current).toEqual({
            repetitions: 3,
            lapses: 2,
            easeFactor: 140,
            intervalDays: 21,
        });
    });

    it("keeps review counters inside PostgreSQL integer capacity", () => {
        const maximumInteger = 2_147_483_647;
        const current = {
            repetitions: maximumInteger,
            lapses: maximumInteger,
            easeFactor: 250,
            intervalDays: 3,
        };

        expect(scheduleFlashcardReview(current, "again", NOW)).toMatchObject({
            repetitions: 0,
            lapses: maximumInteger,
        });
        expect(scheduleFlashcardReview(current, "easy", NOW)).toMatchObject({
            repetitions: maximumInteger,
            lapses: maximumInteger,
        });
    });
});
