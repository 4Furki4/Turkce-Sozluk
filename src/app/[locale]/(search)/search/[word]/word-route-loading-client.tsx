"use client";

import WordLoadingSkeleton from "../_components/word-loading-skeleton";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { extractSearchWordFromPathname } from "@/src/lib/search-route";
import { useWordSearch } from "@/src/hooks/useWordSearch";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";

export default function WordRouteLoadingClient() {
    const pathname = usePathname();
    const locale = useLocale();
    const wordName = extractSearchWordFromPathname(pathname);
    const { data, isLoading, isFetching, isOnline } = useWordSearch(wordName ?? "");

    if (!wordName || isLoading || !data) {
        return <WordLoadingSkeleton />;
    }

    const wordSearchResult = Array.isArray(data)
        ? data.map((item) => ({ word_data: item }))
        : [{ word_data: data }];

    return (
        <WordCardWrapper
            data={wordSearchResult}
            session={null}
            locale={locale as "en" | "tr"}
            isWordFetching={isFetching}
            isOnline={isOnline}
            headingLevel="h1"
        />
    );
}
