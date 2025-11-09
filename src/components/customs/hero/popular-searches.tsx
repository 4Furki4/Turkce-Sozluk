// In src/components/customs/hero/popular-searches.tsx

"use client";

import React, { useState, useEffect } from 'react'; // <-- Import useState, useEffect
import { Link } from '@/src/i18n/routing';
import { api } from '@/src/trpc/react';
import { Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
// 1. --- IMPORT IDB HELPERS ---
import { getCachedPopularData, setCachedPopularData } from '@/src/lib/offline-db';


interface PopularWord {
    id: number;
    name: string;
}

// Define the cache key and max age
const cacheKey = 'popular-allTime';
const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours (in ms)

export default function PopularSearches() {
    const t = useTranslations('Components.PopularSearches');
    const { isBlurEnabled } = useSnapshot(preferencesState);

    // 2. --- STATE FOR DISPLAYED DATA ---
    // This will hold data from cache OR fresh from network
    const [displayedWords, setDisplayedWords] = useState<PopularWord[]>([]);

    // 3. --- LOAD FROM CACHE ON MOUNT ---
    // This effect runs once to populate the initial state from IndexedDB.
    useEffect(() => {
        let isMounted = true;
        getCachedPopularData(cacheKey).then((cached) => {
            if (isMounted && cached) {
                setDisplayedWords(cached.data);
            }
        });
        return () => { isMounted = false; };
    }, []); // Empty dependency array runs this only once on mount

    // 4. --- USE `useQuery` (v5 syntax) ---
    // This query will fetch fresh data if the cached data is "stale"
    const {
        data: freshData,
        error,
        isError,
        isLoading
    } = api.word.getPopularWords.useQuery(
        { limit: 10, period: 'allTime' },
        {
            // This is the most important option. It tells React Query
            // to use cached data (if available) for 24 hours
            // before considering it "stale" and refetching.
            staleTime: cacheMaxAge,

            // `gcTime` (formerly cacheTime) controls how long data
            // stays in memory after being unused.
            gcTime: cacheMaxAge,

            // We'll handle success and error in effects.
        }
    );

    // 5. --- EFFECT FOR HANDLING SUCCESSFUL NETWORK DATA ---
    // This effect runs when `freshData` is populated by the useQuery hook.
    useEffect(() => {
        if (freshData) {
            // Network request succeeded and returned data
            setDisplayedWords(freshData); // Update UI

            // Save fresh data to IDB for the next visit
            setCachedPopularData(cacheKey, freshData).catch(err => {
                console.error("Failed to save popular words to IndexedDB", err);
            });
        }
    }, [freshData]); // Dependency array: runs when `freshData` changes

    // 6. --- EFFECT FOR HANDLING NETWORK ERRORS ---
    // This effect runs if the query fails (e.g., user is offline)
    useEffect(() => {
        if (isError && error) {
            // Network request failed
            console.error("Failed to fetch popular words. Will rely on cache (if any).", error);
            // We don't need to do anything; the `displayedWords` state
            // will just keep its value from the initial cache load.
        }
    }, [isError, error]); // Dependency array: runs on error

    // 7. --- UPDATE RENDER LOGIC ---
    // Only show the component if we have words to display
    if (displayedWords.length === 0) {
        // You could show a skeleton loader here if `isLoading` is true
        // and `displayedWords` is empty.
        if (isLoading) {
            // return <PopularSearchesSkeleton />;
        }
        return null;
    }

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">
                    {t("title")}
                </h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {displayedWords.map((word: PopularWord) => ( // <-- Use `displayedWords`
                    <Link
                        key={word.id}
                        href={{
                            pathname: "/search/[word]",
                            params: { word: encodeURIComponent(word.name) }
                        }}
                        className="block"
                    >
                        <Chip
                            className={cn("rounded-sm md:bg-background/80 dark:bg-background/60 px-4 py-2 text-sm font-medium text-foreground md:shadow-sm ring-1 ring-border/50 hover:bg-background dark:hover:bg-background/80 md:transition-colors md:hover:underline", { "md:backdrop-blur-lg": isBlurEnabled })}
                        >
                            {word.name}
                        </Chip>
                    </Link>
                ))}
            </div>
        </div>
    );
}