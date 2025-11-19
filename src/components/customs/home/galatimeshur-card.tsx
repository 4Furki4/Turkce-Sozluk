"use client";

import { api } from "@/src/trpc/react";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CardHeader, CardBody, CardFooter, Button, Skeleton, Chip } from "@heroui/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";

export function GalatiMeshurCard() {
    const t = useTranslations("Home.HomeExtras");
    const { data, isLoading } = api.extras.getGalatiMeshur.useQuery({ limit: 1 });

    if (isLoading) {
        return <Skeleton className="w-full h-64 rounded-xl" />;
    }

    if (!data || data.length === 0) return null;

    const item = data[0];

    return (
        <CustomCard className="h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50">
            <CardHeader className="flex flex-col items-start pb-0 pt-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {t("galatiMeshurTitle")}
                    </span>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{item.word}</h3>
            </CardHeader>

            <CardBody className="py-4 px-4">
                <p className="text-sm text-default-600 leading-relaxed">
                    {item.explanation}
                </p>
                {item.correctUsage && (
                    <div className="mt-4 p-3 bg-background/50 rounded-lg text-xs">
                        <span className="font-semibold text-success-600 block mb-1">Doğrusu:</span>
                        {item.correctUsage}
                    </div>
                )}
            </CardBody>

            <CardFooter className="pt-0 pb-4 px-4">
                <Button
                    as={Link}
                    href={`/arama/${item.word}`}
                    variant="light"
                    color="warning"
                    size="sm"
                    className="font-medium"
                >
                    {t("seeDetails")}
                </Button>
            </CardFooter>
        </CustomCard>
    );
}