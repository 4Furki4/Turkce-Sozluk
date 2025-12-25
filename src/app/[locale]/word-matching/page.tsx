import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { Params } from "next/dist/server/request/params";
import React from "react";
import { headers } from "next/headers";
import WordMatchingGame from "@/src/components/customs/word-matching-game";


export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Word Matching Game | Turkish Dictionary" : "Kelime Eşleştirme Oyunu | Türkçe Sözlük",
        description: locale === "en"
            ? "Match Turkish words with their meanings in this fun vocabulary game"
            : "Eğlenceli kelime oyunuyla Türkçe kelimeleri anlamlarıyla eşleştirin"
    };
}

export default async function WordMatchingGamePage(
    props: {
        params: Promise<{ locale: string }>;
    }
) {
    const params = await props.params;
    const { locale } = params;

    const session = await auth.api.getSession({
        headers: await headers()
    });

    void api.game.getWordsForMatching.prefetch({ pairCount: 6, source: "all" });

    return (
        <HydrateClient>
            <WordMatchingGame
                session={session}
                locale={locale as "en" | "tr"}
            />
        </HydrateClient>
    );
}
