"use client";

import { api } from "@/src/trpc/react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/routing";
import { Button, Card, CardBody, CardFooter, CardHeader, Skeleton } from "@heroui/react";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Share2 } from "lucide-react";
import { notFound, useParams } from "next/navigation"; // Correct import for params in Next.js 15
import { useLayoutEffect, useState, use } from "react"; // Added use for promise unravelingx"
import CustomCard from "@/src/components/customs/heroui/custom-card";

// Helper component for loading state
function LoadingState() {
    return (
        <div className="container mx-auto p-4 md:p-8 py-12 md:py-20">
            <div className="flex items-center gap-2 mb-8">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-32 h-4 rounded-lg" />
            </div>

            <CustomCard className="w-full min-h-[400px]">
                <CardHeader className="flex flex-col gap-4 p-8">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-44 h-8 rounded-lg" />
                        </div>
                        <Skeleton className="w-24 h-8 rounded-lg" />
                    </div>
                    <Skeleton className="w-3/4 h-12 rounded-lg mt-4" />
                </CardHeader>
                <CardBody className="p-8 gap-6">
                    <Skeleton className="w-full h-4 rounded-lg" />
                    <Skeleton className="w-full h-4 rounded-lg" />
                    <Skeleton className="w-3/4 h-4 rounded-lg" />
                </CardBody>
            </CustomCard>
        </div>
    );
}

export default function GalatiMeshurDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const t = useTranslations("Home.HomeExtras"); // Reusing existing translations if possible, or fallback
    // We might need to add specific translations for this page, but for now we'll use generic or hardcoded ones and fix later.

    // Parse ID safely
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
        notFound();
    }

    const { data: item, isLoading, error } = api.extras.getGalatiMeshurById.useQuery({ id: parsedId });

    if (isLoading) return <LoadingState />;
    if (error || !item) return <div className="p-10 text-center">Not Found</div>;

    return (

        <main className="container mx-auto p-4 md:p-8 py-12 md:py-20">
            {/* Back Link */}
            <Button
                as={Link}
                href="/"
                variant="light"
                className="mb-8 pl-0 gap-2 hover:translate-x-[-4px] transition-transform"
                startContent={<ArrowLeft className="w-5 h-5" />}
            >
                {t("backToHome") || "Back to Home"}
            </Button>

            <CustomCard className="w-full border-none shadow-medium bg-background/60 backdrop-blur-lg">
                <CardHeader className="flex flex-col items-start gap-6 p-6 md:p-10 border-b border-border/50">
                    <div className="flex flex-wrap items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full">
                            <BookOpen className="w-5 h-5" />
                            <span className="font-bold tracking-wide uppercase text-sm">
                                {t("galatiMeshurTitle")}
                            </span>
                        </div>

                        {/* Share/Actions - Optional
                            <Button isIconOnly variant="flat" size="sm">
                                <Share2 className="w-4 h-4" />
                            </Button>
                             */}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
                        {item.word}
                    </h1>

                    {item.correctUsage && (
                        <div className="flex items-center gap-2 text-success-600 bg-success-50 dark:bg-success-900/20 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t("actually", { correctUsage: item.correctUsage })}</span>
                        </div>
                    )}
                </CardHeader>

                <CardBody className="p-6 md:p-10 gap-8">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <h3 className="text-xl font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                            <span className="w-1 h-6 bg-primary rounded-full" />
                            {t("explanation")}
                        </h3>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-light text-lg">
                            {item.explanation}
                        </p>
                    </div>
                </CardBody>

                <CardFooter className="p-6 md:p-10 bg-muted/30 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        {t("seeDetailedMeaning")}
                    </span>
                    <Button
                        as={Link}
                        href={`/search/${item.word}`}
                        color="primary"
                        variant="flat"
                        endContent={<ChevronRight className="w-4 h-4" />}
                        className="w-full sm:w-auto font-medium"
                    >
                        {t("seeInDictionary")}
                    </Button>
                </CardFooter>
            </CustomCard>
        </main>
    );
}
