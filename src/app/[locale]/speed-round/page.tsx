import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { Params } from "next/dist/server/request/params";
import React from "react";
import { headers } from "next/headers";
import SpeedRoundGame from "@/src/components/customs/speed-round-game";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Speed Round | Turkish Dictionary" : "Hızlı Tur | Türkçe Sözlük",
        description: locale === "en"
            ? "Test your Turkish vocabulary knowledge in this fast-paced quiz game"
            : "Bu hızlı tempolu kelime yarışmasında Türkçe kelime bilginizi test edin"
    };
}

export default async function SpeedRoundPage(
    props: {
        params: Promise<{ locale: string }>;
    }
) {
    const params = await props.params;
    const { locale } = params;

    const session = await auth.api.getSession({
        headers: await headers()
    });

    void api.game.getWordsForSpeedRound.prefetch({ questionCount: 10, source: "all" });

    return (
        <HydrateClient>
            <SpeedRoundGame
                session={session}
                locale={locale as "en" | "tr"}
            />
        </HydrateClient>
    );
}
