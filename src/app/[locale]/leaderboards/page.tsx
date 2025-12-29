import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { api, HydrateClient } from "@/src/trpc/server";
import LeaderboardsPage from "@/src/_pages/leaderboards/leaderboards-page";

type Props = {
    params: Promise<{ locale: "en" | "tr" }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Leaderboards" });

    return {
        title: t("title"),
        description: t("description"),
    };
}

export default async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    const session = await auth.api.getSession({ headers: await headers() });

    // Prefetch leaderboard data for all game types
    await Promise.all([
        api.game.getLeaderboard.prefetch({ gameType: "speed_round", limit: 20 }),
        api.game.getLeaderboard.prefetch({ gameType: "word_matching", limit: 20 }),
        api.game.getLeaderboard.prefetch({ gameType: "flashcard", limit: 20 }),
    ]);

    return (
        <HydrateClient>
            <LeaderboardsPage session={session} locale={locale} />
        </HydrateClient>
    );
}
