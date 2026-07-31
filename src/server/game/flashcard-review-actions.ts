import type {
    FlashcardDirection,
    FlashcardRating,
} from "@/db/schema/flashcard_reviews";

export type FlashcardReviewAction = {
    meaningId: number;
    direction: FlashcardDirection;
    rating: FlashcardRating;
};

/**
 * An idempotency key belongs to one logical rating action. Returning a prior
 * outcome for a different card would make the client think it was scheduled,
 * even though it was not, so exact identity is required before replaying it.
 */
export function isSameFlashcardReviewAction(
    previous: FlashcardReviewAction,
    candidate: FlashcardReviewAction,
): boolean {
    return previous.meaningId === candidate.meaningId
        && previous.direction === candidate.direction
        && previous.rating === candidate.rating;
}
