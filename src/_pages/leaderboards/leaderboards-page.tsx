"use client";

import React, { useState } from "react";
import { api } from "@/src/trpc/react";
import { Button, Card, CardBody, Tabs, Tab, Avatar, Chip, Spinner } from "@heroui/react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Trophy, Zap, Link2, Layers, Crown, Medal, Award } from "lucide-react";
import { Session } from "@/src/lib/auth-client";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";

interface LeaderboardsPageProps {
    session: Session | null;
    locale: "en" | "tr";
}

type GameType = "speed_round" | "word_matching" | "flashcard";

const gameConfig = {
    speed_round: {
        icon: Zap,
        color: "warning" as const,
        href: "/speed-round",
    },
    word_matching: {
        icon: Link2,
        color: "secondary" as const,
        href: "/word-matching",
    },
    flashcard: {
        icon: Layers,
        color: "primary" as const,
        href: "/flashcard-game",
    },
};

function getRankIcon(rank: number) {
    if (rank === 1) return <Crown className="w-5 h-5 text-warning fill-warning" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-default-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-default-500">{rank}</span>;
}

export default function LeaderboardsPage({ session, locale }: LeaderboardsPageProps) {
    const t = useTranslations("Leaderboards");
    const [selectedGame, setSelectedGame] = useState<GameType>("speed_round");

    const { data: leaderboardData, isLoading } = api.game.getLeaderboard.useQuery(
        { gameType: selectedGame, limit: 20 },
        { staleTime: 30000 } // 30 second cache
    );

    const { data: userStats } = api.game.getUserGameStats.useQuery(
        { gameType: selectedGame },
        { enabled: !!session }
    );

    const config = gameConfig[selectedGame];
    const GameIcon = config.icon;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-10 h-10 text-warning" />
                    <h1 className="text-3xl font-bold">{t("title")}</h1>
                </div>
                <p className="text-default-500">{t("subtitle")}</p>
            </motion.div>

            {/* Game Tabs */}
            <div className="flex justify-center mb-8">
                <Tabs
                    selectedKey={selectedGame}
                    onSelectionChange={(key) => setSelectedGame(key as GameType)}
                    color="primary"
                    variant="bordered"
                    size="lg"
                >
                    <Tab
                        key="speed_round"
                        title={
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("gameNames.speedRound")}</span>
                            </div>
                        }
                    />
                    <Tab
                        key="word_matching"
                        title={
                            <div className="flex items-center gap-2">
                                <Link2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("gameNames.wordMatching")}</span>
                            </div>
                        }
                    />
                    <Tab
                        key="flashcard"
                        title={
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("gameNames.flashcard")}</span>
                            </div>
                        }
                    />
                </Tabs>
            </div>

            {/* User Stats Card (if logged in) */}
            {session && userStats?.stats && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8"
                >
                    <CustomCard className="bg-gradient-to-r from-primary/10 to-secondary/10">
                        <CardBody className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        src={session.user?.image || undefined}
                                        name={session.user?.name || ""}
                                        size="lg"
                                        className="ring-2 ring-primary"
                                    />
                                    <div>
                                        <p className="font-semibold">{session.user?.name}</p>
                                        <p className="text-sm text-default-500">{t("yourStats")}</p>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-primary">#{userStats.rank}</p>
                                        <p className="text-xs text-default-500">{t("rank")}</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{userStats.stats.bestScore.toLocaleString()}</p>
                                        <p className="text-xs text-default-500">{t("bestScore")}</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-success">{userStats.stats.bestAccuracy}%</p>
                                        <p className="text-xs text-default-500">{t("bestAccuracy")}</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-warning">{userStats.stats.gamesPlayed}</p>
                                        <p className="text-xs text-default-500">{t("gamesPlayed")}</p>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </CustomCard>
                </motion.div>
            )}

            {/* Leaderboard Table */}
            <CustomCard className="shadow-lg">
                <CardBody className="p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-divider">
                        <div className="flex items-center gap-2">
                            <GameIcon className={`w-5 h-5 text-${config.color}`} />
                            <h2 className="font-semibold">{t(`gameNames.${selectedGame === "speed_round" ? "speedRound" : selectedGame === "word_matching" ? "wordMatching" : "flashcard"}` as any)}</h2>
                        </div>
                        <Link href={config.href as any}>
                            <Button size="sm" color={config.color} variant="flat">
                                {t("playNow")}
                            </Button>
                        </Link>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center items-center py-20">
                            <Spinner size="lg" color="primary" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && (!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                        <div className="text-center py-20">
                            <Trophy className="w-16 h-16 mx-auto text-default-300 mb-4" />
                            <p className="text-default-500">{t("noScores")}</p>
                            <Link href={config.href as any}>
                                <Button color="primary" className="mt-4">
                                    {t("beFirst")}
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Leaderboard List */}
                    {!isLoading && leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 && (
                        <div className="divide-y divide-divider">
                            {leaderboardData.leaderboard.map((entry, index) => (
                                <motion.div
                                    key={entry.userId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`flex items-center gap-4 p-4 ${entry.userId === session?.user?.id ? "bg-primary/5" : ""
                                        }`}
                                >
                                    {/* Rank */}
                                    <div className="w-8 flex justify-center">
                                        {getRankIcon(entry.rank)}
                                    </div>

                                    {/* User Info */}
                                    <Avatar
                                        src={entry.userImage || undefined}
                                        name={entry.userName || ""}
                                        size="sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {entry.userName || t("anonymous")}
                                            {entry.userId === session?.user?.id && (
                                                <Chip size="sm" color="primary" variant="flat" className="ml-2">
                                                    {t("you")}
                                                </Chip>
                                            )}
                                        </p>
                                        <p className="text-xs text-default-400">
                                            {entry.gamesPlayed} {t("gamesLabel")} • {entry.bestAccuracy}% {t("accuracy")}
                                        </p>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{entry.bestScore.toLocaleString()}</p>
                                        <p className="text-xs text-default-400">{t("points")}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </CustomCard>

            {/* Call to Action for non-logged in users */}
            {!session && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-center"
                >
                    <CustomCard className="bg-gradient-to-r from-primary/5 to-secondary/5">
                        <CardBody className="p-6">
                            <p className="mb-4">{t("signInPrompt")}</p>
                            <Link href="/signin">
                                <Button color="primary" size="lg">
                                    {t("signIn")}
                                </Button>
                            </Link>
                        </CardBody>
                    </CustomCard>
                </motion.div>
            )}
        </div>
    );
}
