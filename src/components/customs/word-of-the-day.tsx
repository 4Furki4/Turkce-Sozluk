// src/components/customs/word-of-the-day-card.tsx
"use client";

import { api } from "@/src/trpc/react";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CardHeader, CardBody, CardFooter, Button, Skeleton, Tooltip } from "@heroui/react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/src/utils/date";

export function WordOfTheDayCard() {
    const { data: dailyWord, isLoading } = api.word.getWordOfTheDay.useQuery();
    const t = useTranslations("Home.hero.WordOfTheDay")
    const locale = useLocale()
    // Loading State: A nice skeleton that matches the card layout
    if (isLoading) {
        return (
            <CustomCard className="w-full min-h-[300px]">
                <CardHeader className="flex justify-between items-center pb-0">
                    <Skeleton className="w-24 h-4 rounded-lg" />
                    <Skeleton className="w-20 h-4 rounded-lg" />
                </CardHeader>

                <CardBody className="flex flex-col items-center justify-center text-center py-8 gap-4 overflow-hidden">
                    <Skeleton className="w-3/4 h-10 rounded-lg" />
                    <Skeleton className="w-1/4 h-5 rounded-lg" />
                    <Skeleton className="w-full h-16 rounded-lg mt-2" />
                </CardBody>

                <CardFooter className="flex justify-center gap-3 pt-0 pb-6">
                    <Skeleton className="w-24 h-9 rounded-lg" />
                    <Skeleton className="w-28 h-9 rounded-lg" />
                </CardFooter>
            </CustomCard>
        );
    }

    if (!dailyWord || !dailyWord.word) return null;

    const { word } = dailyWord;
    const firstMeaning = word.meanings[0]?.meaning || "Anlam bulunamadı.";

    return (
        <CustomCard className="w-full shadow-lg border-primary/20">
            <CardHeader className="flex justify-between items-center pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-default-500">
                    {t("title")}
                </span>
                <span className="text-xs text-default-400 font-mono">
                    {formatDate(dailyWord.date, locale)}
                </span>
            </CardHeader>

            <CardBody className="flex flex-col items-center justify-center text-center py-6 overflow-hidden">
                <Link
                    href={`/arama/${word.name}`}
                    className="group transition-opacity hover:opacity-80"
                >
                    <h2 className="text-4xl font-bold mb-2 underline text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {word.name}
                    </h2>
                </Link>

                {word.phonetic && (
                    <p className="text-sm text-default-400 mb-5 font-mono bg-primary/15 px-2 py-0.5 rounded-md">
                        /{word.phonetic}/
                    </p>
                )}

                <p className="text-lg text-default-600 italic leading-relaxed px-2 line-clamp-3">
                    &ldquo;{firstMeaning}&rdquo;
                </p>
            </CardBody>

            <CardFooter className="flex justify-center gap-3 pt-0 pb-6">
                <Button
                    as={Link}
                    href={`/arama/${word.name}`}
                    variant="bordered"
                    color="primary"
                    size="sm"
                    className="font-medium border-1"
                >
                    {t("details")}
                </Button>
                <Tooltip content={t("embedComingSoon")}>
                    <Button
                        variant="light"
                        color="default"
                        size="sm"
                        className="text-default-500 hover:text-foreground"
                    >
                        {t("addToYourSite")}
                    </Button>
                </Tooltip>
            </CardFooter>
        </CustomCard>
    );
}