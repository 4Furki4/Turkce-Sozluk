import PlayFlashcardGame from "@/src/components/play/play-flashcard-game";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { auth } from "@/src/lib/auth";
import { parseFlashcardPracticeInput, type FlashcardPracticeSearchParams } from "@/src/lib/flashcard-practice-input";
import { api, HydrateClient } from "@/src/trpc/server";
import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isEnglish = locale === "en";

    return {
        title: isEnglish ? "Flashcards | oyna" : "Kelime Kartları | oyna",
        description: isEnglish
            ? "A focused Turkish flashcard round from oyna."
            : "oyna'da odaklı bir Türkçe kelime kartı turu.",
        robots: { index: false, follow: false },
    };
}

export default async function PlayFlashcardRoute({ params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<FlashcardPracticeSearchParams>;
}) {
    const { locale } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const scope = parseFlashcardPracticeInput(await searchParams ?? {});
    const reviewInput = scope.source === "saved" ? { source: "saved" as const, collectionId: scope.collectionId } : undefined;

    const prefetches: Promise<unknown>[] = [];
    if (!scope.invalidCollection && (scope.source === "all" || session?.user?.id)) {
        prefetches.push(api.game.getRandomWordsForFlashcards.prefetch({ count: 10, source: scope.source, collectionId: scope.collectionId }));
    }
    if (session?.user?.id && !scope.invalidCollection) {
        // This optional query must settle before HydrateClient serializes the
        // cache. A pending query that rejects (for example during a migration
        // rollout) otherwise becomes an RSC hydration error instead of the
        // Flashcards UI's normal recoverable review-queue error state.
        prefetches.push(api.game.getFlashcardReviewSummary.prefetch(reviewInput));
        if (scope.collectionId) prefetches.push(api.user.getSavedWordCollections.prefetch());
    }
    await Promise.all(prefetches);

    return (
        <HydrateClient>
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is required to play flashcards."
                    : "Kelime kartlarını oynamak için JavaScript gerekir."}
            </NoScriptNotice>
            <PlayFlashcardGame
                key={`${scope.source}:${scope.collectionId ?? ""}:${scope.invalidCollection}`}
                session={session}
                locale={locale as "en" | "tr"}
                initialSource={scope.source}
                initialCollectionId={scope.collectionId}
                initialCollectionInvalid={scope.invalidCollection}
            />
        </HydrateClient>
    );
}
