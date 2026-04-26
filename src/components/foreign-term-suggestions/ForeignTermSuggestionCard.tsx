"use client";

import { Card, CardBody, CardFooter, Chip, Avatar } from "@heroui/react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ForeignTermSuggestionVote } from "./ForeignTermSuggestionVote";
import { Link } from "@/src/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { tr, enUS } from "date-fns/locale";

interface SuggestionCardProps {
    suggestion: {
        id: number;
        foreignTerm: string;
        foreignMeaning: string;
        suggestedTurkishWord: string;
        isNewWord: boolean;
        status: "pending" | "approved" | "rejected";
        reason: string | null;
        createdAt: Date;
    };
    user: {
        id: string;
        name: string | null;
        image: string | null;
    } | null;
    language: {
        id: number;
        language_en: string | null;
        language_tr: string | null;
        language_code: string | null;
    } | null;
    voteCount: number;
    userVote: number | null;
    isAuthenticated: boolean;
}

export function ForeignTermSuggestionCard({
    suggestion,
    user,
    language,
    voteCount,
    userVote,
    isAuthenticated,
}: SuggestionCardProps) {
    const t = useTranslations("ForeignTermSuggestions.card");
    const locale = useLocale();

    const statusColors: Record<string, "default" | "success" | "danger" | "warning"> = {
        pending: "warning",
        approved: "success",
        rejected: "danger",
    };

    const languageName = locale === "tr" ? language?.language_tr : language?.language_en;

    return (
        <Card className="bg-background/60 border border-border hover:border-primary/50 transition-colors">
            <CardBody className="gap-4">
                {/* Header with status and language */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Chip radius="md" size="sm" color={statusColors[suggestion.status]} variant="flat">
                            {t(suggestion.status)}
                        </Chip>
                        {language && (
                            <Chip radius="md" size="sm" variant="bordered">
                                {languageName}
                            </Chip>
                        )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(suggestion.createdAt), {
                            addSuffix: true,
                            locale: locale === "tr" ? tr : enUS,
                        })}
                    </span>
                </div>

                {/* Main content */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">{t("foreignTerm")}:</span>
                        <span className="font-semibold text-lg">{suggestion.foreignTerm}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground text-sm">{t("meaning")}:</span>
                        <p className="text-foreground mt-1">{suggestion.foreignMeaning}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/10 p-3 rounded-md">
                        <span className="text-muted-foreground text-sm">{t("suggestedWord")}:</span>
                        {suggestion.isNewWord ? (
                            // New word: show plain text with badge
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-xl text-primary">
                                    {suggestion.suggestedTurkishWord}
                                </span>
                                <Chip radius="md" size="sm" color="secondary" variant="flat">
                                    {t("newWord")}
                                </Chip>
                            </div>
                        ) : (
                            // Existing word: show as link
                            <Link
                                href={{ pathname: "/search/[word]", params: { word: suggestion.suggestedTurkishWord } }}
                                className="font-bold text-xl text-primary hover:underline"
                            >
                                {suggestion.suggestedTurkishWord}
                            </Link>
                        )}
                    </div>
                    {suggestion.reason && (
                        <div>
                            <span className="text-muted-foreground text-sm">{t("reason")}:</span>
                            <p className="text-foreground/80 text-sm mt-1 italic">
                                &quot;{suggestion.reason}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </CardBody>

            <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                {/* User info */}
                <div className="flex items-center gap-2">
                    <Avatar
                        src={user?.image || undefined}
                        name={user?.name?.[0] || "?"}
                        size="sm"
                        className="w-8 h-8"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user?.name || t("anonymous")}</span>
                        <span className="text-xs text-muted-foreground">{t("suggestedBy")}</span>
                    </div>
                </div>

                {/* Voting */}
                <ForeignTermSuggestionVote
                    suggestionId={suggestion.id}
                    voteCount={voteCount}
                    userVote={userVote}
                    isAuthenticated={isAuthenticated}
                />
            </CardFooter>
        </Card>
    );
}
