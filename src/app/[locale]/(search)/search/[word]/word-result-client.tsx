"use client";

import { useWordSearch } from "@/src/hooks/useWordSearch";
import WordLoadingSkeleton from "../_components/word-loading-skeleton";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import { Session } from "@/src/lib/auth";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";
import OfflineSearchStateCard from "@/src/components/customs/search/offline-search-state-card";

type WordResultClientProps = {
    session: Session | null;
    wordName: string;
};

export default function WordResultClient({ session, wordName }: WordResultClientProps) {
    const locale = useLocale();
    // The initial data from the server is passed directly to our hook.
    // TanStack Query will use this data immediately without refetching on the client.
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
    } = useWordSearch(wordName);

    // The loading skeleton will only be shown on subsequent client-side navigation.
    if (isLoading) {
        return <WordLoadingSkeleton />;
    }

    if (!isOnline && !hasOfflineDataset && !isOfflineLoading) {
        return (
            <OfflineSearchStateCard
                wordName={wordName}
                state={offlineStatus === "failed" ? "failed" : "not-downloaded"}
                error={offlineError?.message ?? null}
            />
        );
    }

    if (!isOnline && hasOfflineDataset && !data && !isOfflineLoading) {
        return <OfflineSearchStateCard wordName={wordName} state="no-match" />;
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return <WordNotFoundCard session={session} />;
    }

    // Handle both single result (normal search) and multiple results (pattern search)
    const formattedData = Array.isArray(data)
        ? data.map(item => ({ word_data: item }))
        : [{ word_data: data }];

    return (
        <WordCardWrapper
            locale={locale as "en" | "tr"}
            data={formattedData as any}
            session={session}
            isWordFetching={isFetching}
            isOnline={isOnline}
        />
    );
}
