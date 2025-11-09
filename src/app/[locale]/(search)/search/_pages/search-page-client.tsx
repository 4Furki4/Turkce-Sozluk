"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { useWordSearch } from "@/src/hooks/useWordSearch";
import Loading from "../_loading";
import WordNotFoundCard from "@/src/components/customs/word-not-found-card";
import WordCardWrapper from "@/src/components/customs/word-card-wrapper";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/routing";

export default function SearchPageClient() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const locale = useLocale();
    const [wordName, setWordName] = useState<string | null>(null);

    useEffect(() => {
        // Extract word from pathname like /en/search/deneme -> deneme
        const pathSegments = pathname.split('/');
        const searchIndex = pathSegments.indexOf('search');

        if (searchIndex !== -1 && pathSegments[searchIndex + 1]) {
            const extractedWord = decodeURIComponent(pathSegments[searchIndex + 1]);
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
        return <Loading />;
    }

    // Show the "Not Found" component if there's an error or no data
    if (isError || !data) {
        return <WordNotFoundCard session={session} />;
    }

    console.log(`[SearchPageClient] Rendering word card for: ${wordName}, source: ${data.source}`);

    // WordCardWrapper expects WordSearchResult[] format, so we need to wrap the data properly
    const wordSearchResult = {
        word_data: data
    };

    return (
        <WordCardWrapper
            data={[wordSearchResult]}
            session={session}
            locale={locale as "en" | "tr"}
        />
    );
}
