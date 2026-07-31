import { isSameFlashcardReviewAction } from "../flashcard-review-actions";

const initialAction = {
    meaningId: 101,
    direction: "word" as const,
    rating: "good" as const,
};

describe("flashcard review action replay", () => {
    it("replays an action ID only for the original card, direction, and rating", () => {
        expect(isSameFlashcardReviewAction(initialAction, { ...initialAction })).toBe(true);
        expect(isSameFlashcardReviewAction(initialAction, { ...initialAction, meaningId: 102 })).toBe(false);
        expect(isSameFlashcardReviewAction(initialAction, { ...initialAction, direction: "meaning" })).toBe(false);
        expect(isSameFlashcardReviewAction(initialAction, { ...initialAction, rating: "easy" })).toBe(false);
    });
});
