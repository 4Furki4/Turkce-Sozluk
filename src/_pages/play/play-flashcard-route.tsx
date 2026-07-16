import PlayFlashcardGame from "@/src/components/play/play-flashcard-game";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { auth } from "@/src/lib/auth";
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

export default async function PlayFlashcardRoute({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    void api.game.getRandomWordsForFlashcards.prefetch({ count: 10, source: "all" });

    return (
        <HydrateClient>
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is required to play flashcards."
                    : "Kelime kartlarını oynamak için JavaScript gerekir."}
            </NoScriptNotice>
            <PlayFlashcardGame session={session} locale={locale as "en" | "tr"} />
        </HydrateClient>
    );
}
