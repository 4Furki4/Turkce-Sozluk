"use client";

import type { ReactNode } from "react";
import { useWordSearch } from "@/src/hooks/useWordSearch";
import WordLoadingSkeleton from "../_components/word-loading-skeleton";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import type { Session } from "@/src/lib/auth-client";
import {
    extractSearchWordFromPathname,
    normalizeSearchWord,
    OFFLINE_SEARCH_PARAM,
    SEARCH_QUERY_PARAM,
} from "@/src/lib/search-route";
import SearchContainer from "@/src/components/customs/search/search-container";
import { useNavigationProgress } from "@/src/lib/navigation-progress";
import OfflineSearchStateCard from "@/src/components/customs/search/offline-search-state-card";

type SearchPageClientProps = {
    initialWord?: string;
    offlineOnly?: boolean;
    session?: Session | null;
    children?: ReactNode;
};

export default function SearchPageClient({
    initialWord = "",
    offlineOnly = false,
    session = null,
    children,
}: SearchPageClientProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const locale = useLocale();
    const queryWord = normalizeSearchWord(
        searchParams.get(SEARCH_QUERY_PARAM) ??
        searchParams.get(OFFLINE_SEARCH_PARAM) ??
        undefined,
    );
    const wordName = initialWord || queryWord || extractSearchWordFromPathname(pathname) || null;
    const shouldUseOfflineOnly =
        offlineOnly ||
        Boolean(searchParams.get(OFFLINE_SEARCH_PARAM)) ||
        Boolean(wordName?.includes("_"));
    const { phase } = useNavigationProgress();

    // The word search hook with offline support
    const {
        data,
        isLoading,
        isFetching,
        isError,
        isOnline,
        hasOfflineDataset,
        isOfflineLoading,
        offlineStatus,
        offlineError,
    } = useWordSearch(
        wordName || '',
        { offlineOnly: shouldUseOfflineOnly },
    );

    if (!wordName) {
        return <>{children}</>;
    }

    // Show loading while extracting word from URL or while searching
    if (phase === "loading" || isLoading) {
        return (
            <WordClientShell>
                <WordLoadingSkeleton />
            </WordClientShell>
        );
    }

    if ((shouldUseOfflineOnly || !isOnline) && !hasOfflineDataset && !isOfflineLoading) {
        return (
            <WordClientShell>
                <OfflineSearchStateCard
                    wordName={wordName}
                    state={offlineStatus === "failed" ? "failed" : "not-downloaded"}
                    error={offlineError?.message ?? null}
                />
            </WordClientShell>
        );
    }

    if ((shouldUseOfflineOnly || !isOnline) && hasOfflineDataset && !data && !isOfflineLoading) {
        return (
            <WordClientShell>
                <OfflineSearchStateCard wordName={wordName} state="no-match" />
            </WordClientShell>
        );
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return (
            <WordClientShell>
                <WordNotFoundCard session={session} searchedWord={wordName} />
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
