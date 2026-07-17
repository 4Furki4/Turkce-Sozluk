import PlayWordMatchingGame from "@/src/components/play/play-word-matching-game";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isEnglish = locale === "en";

    return {
        title: isEnglish ? "Word Matching | oyna" : "Kelime Eşleştirme | oyna",
        description: isEnglish
            ? "A focused Turkish word matching round from oyna."
            : "oyna'da odaklı bir Türkçe kelime eşleştirme turu.",
        robots: { index: false, follow: false },
    };
}

export default async function PlayWordMatchingRoute({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    void api.game.getWordsForMatching.prefetch({ pairCount: 6, source: "all" });

    return (
        <HydrateClient>
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is required to play word matching."
                    : "Kelime eşleştirmeyi oynamak için JavaScript gerekir."}
            </NoScriptNotice>
            <PlayWordMatchingGame session={session} locale={locale as "en" | "tr"} />
        </HydrateClient>
    );
}
