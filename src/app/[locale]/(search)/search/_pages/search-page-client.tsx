"use client";

import { useEffect, useState } from "react";

import { useWordSearch } from "@/src/hooks/useWordSearch";
import WordLoadingSkeleton from "../_components/word-loading-skeleton";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { authClient } from "@/src/lib/auth-client";
import { extractSearchWordFromPathname } from "@/src/lib/search-route";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";

export default function SearchPageClient() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const locale = useLocale();
    const [wordName, setWordName] = useState<string | null>(null);

    useEffect(() => {
        const extractedWord = extractSearchWordFromPathname(pathname);

        if (extractedWord) {
            console.log(`[SearchPageClient] Extracted word from path: ${extractedWord}`);
            setWordName(extractedWord);
        } else {
            console.log(`[SearchPageClient] No word found in path: ${pathname}`);
            // If no word in path, redirect to home
            router.push('/');
        }
    }, [pathname, router]);

    // The word search hook with offline support
    const { data, isLoading, isError } = useWordSearch(wordName || '');

    // Show loading while extracting word from URL or while searching
    if (!wordName || isLoading) {
        return <WordLoadingSkeleton />;
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return <WordNotFoundCard session={session} />;
    }

    console.log(`[SearchPageClient] Rendering word card for: ${wordName}, source: ${data.source}`);

    // WordCardWrapper expects WordSearchResult[] format, so we need to wrap the data properly
    const wordSearchResult = Array.isArray(data)
        ? data.map(item => ({ word_data: item }))
        : [{ word_data: data }];

    return (
        <WordCardWrapper
            data={wordSearchResult}
            session={session}
            locale={locale as "en" | "tr"}
        />
    );
}
