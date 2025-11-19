"use client";

import { api } from "@/src/trpc/react";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CardHeader, CardBody, Skeleton } from "@heroui/react";
import { useTranslations } from "next-intl";
import { XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function MisspellingsCard() {
    const t = useTranslations("Home.HomeExtras");
    const { data, isLoading } = api.extras.getMisspellings.useQuery({ limit: 5 });

    if (isLoading) {
        return <Skeleton className="w-full h-64 rounded-xl" />;
    }

    if (!data || data.length === 0) return null;

    return (
        <CustomCard className="h-full">
            <CardHeader className="flex items-center gap-2 pb-2 pt-4 px-4">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span className="text-xs font-bold uppercase tracking-wider text-danger">
                    {t("misspellingsTitle")}
                </span>
            </CardHeader>

            <CardBody className="py-2 px-0">
                <div className="flex flex-col">
                    {data.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between px-4 py-3 ${index !== data.length - 1 ? "border-b border-divider" : ""
                                }`}
                        >
                            {/* Incorrect Side */}
                            <div className="flex items-center gap-2 text-default-400 line-through decoration-danger/50 w-1/2">
                                <XCircle className="w-3 h-3 text-danger shrink-0" />
                                <span className="text-sm truncate">{item.wrong}</span>
                            </div>

                            {/* Arrow */}
                            <div className="text-default-300 px-2">→</div>

                            {/* Correct Side */}
                            <Link href={`/arama/${item.correct}`} className="flex items-center gap-2 text-success w-1/2 justify-end hover:underline">
                                <span className="text-sm font-medium truncate">{item.correct}</span>
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                            </Link>
                        </div>
                    ))}
                </div>
            </CardBody>
        </CustomCard>
    );
}