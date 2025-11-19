"use client";

import React, { useState, useEffect } from 'react'; // <-- Import hooks
import { useTranslations } from 'next-intl';
import { api } from '@/src/trpc/react';
import { Chip } from '@heroui/react';
import { Link } from '@/src/i18n/routing';
import { TrendingUp } from 'lucide-react';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { cn } from '@/lib/utils';
// 1. --- IMPORT IDB HELPERS ---
import { getCachedPopularData, setCachedPopularData } from '@/src/lib/offline-db';
import PopularSearchesSkeleton from './popular-searches-skeleton';

interface TrendingWord {
    id: number;
    name: string;
}

interface TrendingSearchesProps {
    period: '7days' | '30days';
}

// Define the cache max age
const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours (in ms)

export default function TrendingSearches({ period = '7days' }: TrendingSearchesProps) {
    const t = useTranslations('Components.TrendingSearches');
    const { isBlurEnabled } = useSnapshot(preferencesState);

    // 2. --- STATE FOR DISPLAYED DATA ---
    const [displayedWords, setDisplayedWords] = useState<TrendingWord[]>([]);

    // 3. --- DYNAMIC KEYS ---
    // Key for IndexedDB cache
    const cacheKey = `trending-${period}`;
    // Key for the tRPC query
    const queryPeriod = period === '7days' ? 'last7Days' : 'last30Days';

    // 4. --- LOAD FROM CACHE ON MOUNT ---
    // This effect runs once to populate the initial state from IndexedDB.
    useEffect(() => {
        let isMounted = true;
        getCachedPopularData(cacheKey).then((cached) => {
            if (isMounted && cached) {
                setDisplayedWords(cached.data);
            }
        });
        return () => { isMounted = false; };
    }, [cacheKey]); // Dependency: re-run if the period (and thus key) changes

    // 5. --- USE `useQuery` (v5 syntax) ---
    const {
        data: freshData,
        error,
        isError,
        isLoading
    } = api.word.getPopularWords.useQuery(
        {
            limit: 10,
            period: queryPeriod // Use the correct period for the query
        },
        {
            staleTime: cacheMaxAge,
            gcTime: cacheMaxAge,
        }
    );

    // 6. --- EFFECT FOR HANDLING SUCCESSFUL NETWORK DATA ---
    useEffect(() => {
        if (freshData) {
            setDisplayedWords(freshData); // Update UI

            // Save fresh data to IDB
            setCachedPopularData(cacheKey, freshData).catch(err => {
                console.error(`Failed to save ${cacheKey} to IndexedDB`, err);
            });
        }
    }, [freshData, cacheKey]); // Dependency: run when fresh data or the key changes

    // 7. --- EFFECT FOR HANDLING NETWORK ERRORS ---
    useEffect(() => {
        if (isError && error) {
            console.error(`Failed to fetch ${cacheKey}. Will rely on cache (if any).`, error);
        }
    }, [isError, error, cacheKey]);

    // 8. --- UPDATE RENDER LOGIC ---
    if (displayedWords.length === 0) {
        if (isLoading) {
            return <PopularSearchesSkeleton />;
        }
        return null;
    }

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">
                    {t(period === '7days' ? 'title7Days' : 'title30Days')}
                </h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {displayedWords.map((word: TrendingWord) => ( // <-- Use `displayedWords`
                    <Link
                        href={{
                            pathname: "/search/[word]",
                            params: { word: encodeURIComponent(word.name) }
                        }}
                        key={word.id}
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