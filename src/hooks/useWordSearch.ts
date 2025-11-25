"use client";
import { useQuery, onlineManager } from "@tanstack/react-query";
import { getWordByNameOffline, searchByPattern } from "@/src/lib/offline-db";
import { useState, useEffect } from "react";
import { api } from "@/src/trpc/react";
import { WordData } from "../lib/db-config";

// Define a unified result type for our hook
type UseWordSearchResult = {
    data: (WordData | WordData[]) & { source: "online" | "offline" } | undefined;
    isLoading: boolean;    // For the initial page skeleton
    isFetching: boolean;   // For the background "revalidate" spinner
    isError: boolean;      // For the "not found" state
    isOnline: boolean;     // For the "wifi off" icon
    error: Error | null;
};

export function useWordSearch(wordName: string): UseWordSearchResult {
    // State to track the network connection status
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof window !== "undefined") {
            return navigator.onLine && onlineManager.isOnline();
        }
        return true; // Default to online on server
    });

    const trpcClient = api.useUtils().client;

    // Listen for online/offline events
    useEffect(() => {
        const updateOnlineStatus = () => {
            const online = navigator.onLine && onlineManager.isOnline();
            setIsOnline(online);
        };

        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
        const unsubscribe = onlineManager.subscribe(updateOnlineStatus);

        return () => {
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", updateOnlineStatus);
            unsubscribe();
        };
    }, []);

    const isPatternSearch = wordName.includes("_");

    // --- 1. OFFLINE QUERY ---
    const { data: offlineData, isLoading: isOfflineLoading } = useQuery({
        queryKey: ["word-offline", wordName],
        queryFn: async () => {
            if (!wordName) return undefined;
            try {
                if (isPatternSearch) {
                    console.log(`Searching offline DB for pattern: "${wordName}"`);
                    const results = await searchByPattern(wordName);
                    // If results found, return them. If empty, return undefined so we can try online (though pattern search is offline only per requirements)
                    // Requirement: "UX: The search must happen on the client side without hitting the server."
                    // So for pattern search, we only rely on offline DB.
                    return results.length > 0 ? { data: results, source: "offline" as const } : undefined;
                }

                console.log(`Checking offline DB for: "${wordName}"`);
                const data = await getWordByNameOffline(wordName);
                return data ? { data: data, source: "offline" as const } : undefined;
            } catch (e) {
                console.error("Offline search failed:", e);
                return undefined; // Don't throw, just return nothing
            }
        },
        enabled: !!wordName,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
    });

    // --- 2. ONLINE QUERY ---
    // We skip online query if it is a pattern search
    const onlineQuery = useQuery({
        queryKey: ["word-online", wordName],
        queryFn: async () => {
            if (!wordName) return undefined;
            try {
                console.log(`Fetching online for: "${wordName}"`);
                const onlineResult = await trpcClient.word.getWord.query({
                    name: wordName,
                });

                if (onlineResult && onlineResult.length > 0 && onlineResult[0]?.word_data) {
                    return { data: onlineResult[0].word_data, source: "online" as const };
                }
                // If API returns empty, it's a 404
                throw new Error(`Word "${wordName}" not found online.`);
            } catch (e) {
                console.warn("Online fetch failed.", e);
                throw e; // Propagate the error so isError becomes true
            }
        },
        enabled: isOnline && !!wordName && !isPatternSearch,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
    });

    // --- 3. COMBINE RESULTS ---

    // Prioritize "fresh" online data, fall back to "stale" offline data.
    // If pattern search, onlineQuery.data will be undefined (disabled).
    const data = (onlineQuery.data as any) ?? (offlineData as any);

    // We are "loading" ONLY if we have NO data to show yet,
    // and the relevant query is still running.
    const isLoading =
        !data && (isOnline && !isPatternSearch ? onlineQuery.isLoading : isOfflineLoading);

    // We are in an "error" state ONLY if the online query failed
    // AND we also have no offline data to show as a fallback.
    // For pattern search, if offlineData is undefined, it's an error (no matches).
    const isError = isPatternSearch
        ? !offlineData && !isOfflineLoading
        : onlineQuery.isError && !data;

    // We are "fetching" if we are online AND the online query is running,
    // (This includes the background revalidation)
    const isFetching = isOnline && onlineQuery.isFetching;

    return {
        data: data?.data ? { ...data.data, source: data.source } : undefined,
        isLoading,    // Use this for the main page skeleton
        isFetching,   // Use this for the small loading icon
        isError,      // Use this for "Not Found"
        isOnline,     // Use this to decide between loading icon and wifi-off icon
        error: onlineQuery.error as Error | null,
    };
}