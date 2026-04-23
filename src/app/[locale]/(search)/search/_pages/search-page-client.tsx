"use client";

import type { ReactNode } from "react";
import { useWordSearch } from "@/src/hooks/useWordSearch";
import WordLoadingSkeleton from "../_components/word-loading-skeleton";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { extractSearchWordFromPathname } from "@/src/lib/search-route";
import Hero from "@/src/components/hero";
import SearchContainer from "@/src/components/customs/search/search-container";
import { useNavigationProgress } from "@/src/lib/navigation-progress";

export default function SearchPageClient() {
    const pathname = usePathname();
    const { data: session } = authClient.useSession();
    const locale = useLocale();
    const wordName = extractSearchWordFromPathname(pathname) ?? null;
    const { phase } = useNavigationProgress();

    // The word search hook with offline support
    const { data, isLoading, isFetching, isError, isOnline } = useWordSearch(wordName || '');

    if (!wordName) {
        return <Hero />;
    }

    // Show loading while extracting word from URL or while searching
    if (phase === "loading" || isLoading) {
        return (
            <WordClientShell>
                <WordLoadingSkeleton />
            </WordClientShell>
        );
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return (
            <WordClientShell>
                <WordNotFoundCard session={session} />
            </WordClientShell>
        );
    }

    // WordCardWrapper expects WordSearchResult[] format, so we need to wrap the data properly
    const wordSearchResult = Array.isArray(data)
        ? data.map(item => ({ word_data: item }))
        : [{ word_data: data }];

    return (
        <WordClientShell>
            <WordCardWrapper
                data={wordSearchResult}
                session={session}
                locale={locale as "en" | "tr"}
                isWordFetching={isFetching}
                isOnline={isOnline}
                headingLevel="h1"
            />
        </WordClientShell>
    );
}

function WordClientShell({ children }: { children: ReactNode }) {
    return (
        <div className="w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <SearchContainer showTrending={false} className="mb-6" />
            </div>
            <div className="mx-auto max-w-7xl">
                {children}
            </div>
        </div>
    );
}
