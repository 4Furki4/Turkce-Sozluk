import PlaySpeedRoundGame from "@/src/components/play/play-speed-round-game";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const isEnglish = locale === "en";

    return {
        title: isEnglish ? "Speed Round | oyna" : "Hızlı Tur | oyna",
        description: isEnglish
            ? "A rapid Turkish vocabulary sprint from oyna."
            : "oyna'dan hızlı bir Türkçe kelime sprinti.",
        robots: { index: false, follow: false },
    };
}

export default async function PlaySpeedRoundRoute({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

    void api.game.getWordsForSpeedRound.prefetch({ questionCount: 10, source: "all" });

    return (
        <HydrateClient>
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is required to play Speed Round."
                    : "Hızlı Tur'u oynamak için JavaScript gerekir."}
            </NoScriptNotice>
            <PlaySpeedRoundGame session={session} locale={locale as "en" | "tr"} />
        </HydrateClient>
    );
}
