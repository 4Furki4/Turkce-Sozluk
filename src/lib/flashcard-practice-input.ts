import { z } from "zod";

export type FlashcardPracticeSearchParams = Record<string, string | string[] | undefined>;

/** Invalid collection links stay visibly scoped instead of opening a broader deck. */
export function parseFlashcardPracticeInput(params: FlashcardPracticeSearchParams) {
    const hasCollection = params.collectionId !== undefined;
    const collection = z.string().uuid().safeParse(params.collectionId);

    return {
        source: (hasCollection || params.source === "saved" ? "saved" : "all") as "all" | "saved",
        collectionId: collection.success ? collection.data : undefined,
        invalidCollection: hasCollection && !collection.success,
    };
}
