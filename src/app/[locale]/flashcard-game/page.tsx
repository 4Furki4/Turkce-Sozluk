import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { Params } from "next/dist/server/request/params";
import React from "react";

import { headers } from "next/headers";
import FlashcardGame from "@/src/components/customs/flashcard-game";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Flashcard Game | Turkish Dictionary" : "Kelime Kartları Oyunu | Türkçe Sözlük",
        description: locale === "en"
            ? "Test your Turkish vocabulary with interactive flashcards"
            : "Etkileşimli kelime kartlarıyla Türkçe kelime bilginizi test edin"
    };
}

export default async function FlashcardGamePage(
    props: {
        params: Promise<{ locale: string }>;
    }
) {
    const params = await props.params;
    const { locale } = params;

    const session = await auth.api.getSession({
        headers: await headers()
    });

    void api.game.getRandomWordsForFlashcards.prefetch({ count: 10, source: "all" });

    return (
        <HydrateClient>
            <FlashcardGame
                session={session}
                locale={locale as "en" | "tr"}
            />
        </HydrateClient>
    );
}
