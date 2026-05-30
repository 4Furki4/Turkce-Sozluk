import { auth } from "@/src/lib/auth";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import { api, HydrateClient } from "@/src/trpc/server";
import LeaderboardsPage from "@/src/_pages/leaderboards/leaderboards-page";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";

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
    const speedRoundLeaderboard = await api.game.getLeaderboard({ gameType: "speed_round", limit: 20 });

    return (
        <HydrateClient>
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is disabled. Interactive game tabs and personal stats require JavaScript, but the speed-round leaderboard is available below."
                    : "JavaScript kapalı. Etkileşimli oyun sekmeleri ve kişisel istatistikler JavaScript gerektirir; hızlı tur sıralaması aşağıda kullanılabilir."}
            </NoScriptNotice>
            <noscript>
                <section className="container mx-auto mb-6 max-w-4xl rounded-md border border-border bg-background/40 p-4">
                    <h2 className="mb-3 text-xl font-semibold">{locale === "en" ? "Speed Round Leaderboard" : "Hızlı Tur Sıralaması"}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-2 pr-4">#</th>
                                    <th className="py-2 pr-4">{locale === "en" ? "Player" : "Oyuncu"}</th>
                                    <th className="py-2 pr-4">{locale === "en" ? "Score" : "Puan"}</th>
                                    <th className="py-2">{locale === "en" ? "Accuracy" : "Doğruluk"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {speedRoundLeaderboard.leaderboard.map((entry) => (
                                    <tr key={entry.userId} className="border-b border-border/60">
                                        <td className="py-2 pr-4">{entry.rank}</td>
                                        <td className="py-2 pr-4">{entry.userName || (locale === "en" ? "Anonymous" : "Anonim")}</td>
                                        <td className="py-2 pr-4">{entry.bestScore.toLocaleString(locale === "en" ? "en-US" : "tr-TR")}</td>
                                        <td className="py-2">{entry.bestAccuracy}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </noscript>
            <LeaderboardsPage session={session} locale={locale} />
        </HydrateClient>
    );
}
