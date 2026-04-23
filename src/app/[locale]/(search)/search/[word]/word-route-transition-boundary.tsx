"use client";

import type { ReactNode } from "react";

import { useNavigationProgress } from "@/src/lib/navigation-progress";
import WordLoadingSkeleton from "../_components/word-loading-skeleton";

export default function WordRouteTransitionBoundary({
    children,
}: {
    children: ReactNode;
}) {
    const { phase } = useNavigationProgress();

    if (phase === "loading") {
        return <WordLoadingSkeleton />;
    }

    return <>{children}</>;
}
