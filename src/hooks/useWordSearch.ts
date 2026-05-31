"use client";
import { useQuery, onlineManager } from "@tanstack/react-query";
import { getOfflineMetadata, getWordByNameOffline, searchByPattern } from "@/src/lib/offline-db";
import { useState, useEffect } from "react";
import { api } from "@/src/trpc/react";
import { OfflineInstallStatus, WordData } from "../lib/db-config";

type WordDataWithSource = WordData & { source: "online" | "offline" };

type WordQueryData =
    | { data: WordData; source: "online" | "offline" }
    | { data: WordData[]; source: "offline" };

export const getOfflineWordSearchQueryKey = (wordName: string) =>
    ["word-offline", wordName] as const;

export const toOfflineWordSearchResult = (data: WordData): WordQueryData => ({
    data,
    source: "offline",
});

// Define a unified result type for our hook
type UseWordSearchResult = {
    data: WordDataWithSource | WordDataWithSource[] | undefined;
    isLoading: boolean;    // For the initial page skeleton
    isFetching: boolean;   // For the background "revalidate" spinner
    isError: boolean;      // For the "not found" state
    isOnline: boolean;     // For the "wifi off" icon
    offlineStatus: OfflineInstallStatus | "checking";
    hasOfflineDataset: boolean;
    isOfflineLoading: boolean;
    offlineError: Error | null;
    error: Error | null;
};

type UseWordSearchOptions = {
    offlineOnly?: boolean;
};

const isNetworkFailure = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return /fetch|network|load failed|econnrefused|eaddrnotavail|failed to fetch/i.test(message);
};

export function useWordSearch(
    wordName: string,
    options: UseWordSearchOptions = {},
): UseWordSearchResult {
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
            onlineManager.setOnline(navigator.onLine);
            const online = navigator.onLine && onlineManager.isOnline();
            setIsOnline(online);
        };

        updateOnlineStatus();
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

    const {
        data: offlineMetadata,
        isLoading: isOfflineMetadataLoading,
        error: offlineMetadataError,
    } = useQuery({
        queryKey: ["offline-metadata"],
        queryFn: getOfflineMetadata,
        enabled: !!wordName,
        staleTime: 5 * 1000,
        gcTime: 1000 * 60 * 5,
        networkMode: "always",
        retry: false,
    });

    const hasOfflineDataset = Boolean(offlineMetadata?.activeVersion);

    // --- 1. OFFLINE QUERY ---
    const {
        data: offlineData,
        isLoading: isOfflineWordLoading,
        error: offlineWordError,
    } = useQuery({
        queryKey: getOfflineWordSearchQueryKey(wordName),
        queryFn: async () => {
            if (!wordName) return undefined;
            if (isPatternSearch) {
                const results = await searchByPattern(wordName);
                return results.length > 0 ? { data: results, source: "offline" as const } : undefined;
            }

            const data = await getWordByNameOffline(wordName);
            return data ? { data: data, source: "offline" as const } : undefined;
        },
        enabled: !!wordName && !isOfflineMetadataLoading && hasOfflineDataset,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
        networkMode: "always",
        retry: false,
    });

    const isOfflineLoading = isOfflineMetadataLoading || isOfflineWordLoading;
    const canUseOnlineSearch =
        isOnline &&
        !!wordName &&
        !isPatternSearch &&
        !options.offlineOnly &&
        !offlineData &&
        !isOfflineLoading;

    // --- 2. ONLINE QUERY ---
    // We skip online query if it is a pattern search
    const onlineQuery = useQuery({
        queryKey: ["word-online", wordName],
        queryFn: async () => {
            if (!wordName) return undefined;
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                return undefined;
            }

            let onlineResult: Awaited<ReturnType<typeof trpcClient.word.getWord.query>>;
            try {
                onlineResult = await trpcClient.word.getWord.query({
                    name: wordName,
                });
            } catch (error) {
                if (isNetworkFailure(error)) {
                    onlineManager.setOnline(false);
                    setIsOnline(false);
                }

                throw error;
            }

            if (onlineResult && onlineResult.length > 0 && onlineResult[0]?.word_data) {
                return { data: onlineResult[0].word_data, source: "online" as const };
            }

            return undefined;
        },
        enabled: canUseOnlineSearch,
        staleTime: 1000 * 60 * 5, // 5 minutes
        networkMode: "online",
        retry: (failureCount) => {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                return false;
            }

            return failureCount < 1;
        },
    });

    // --- 3. COMBINE RESULTS ---

    // Prioritize "fresh" online data, fall back to "stale" offline data.
    // If pattern search, onlineQuery.data will be undefined (disabled).
    const data = (onlineQuery.data ?? offlineData) as WordQueryData | undefined;

    // We are "loading" ONLY if we have NO data to show yet,
    // and the relevant query is still running.
    const isLoading =
        !data && (canUseOnlineSearch ? onlineQuery.isLoading : isOfflineLoading);

    // We are in an "error" state ONLY if the online query failed
    // AND we also have no offline data to show as a fallback.
    // For pattern search, if offlineData is undefined, it's an error (no matches).
    const isError = isPatternSearch || options.offlineOnly || !isOnline
        ? !offlineData && !isOfflineLoading
        : !data && !isOfflineLoading && (onlineQuery.isError || onlineQuery.isSuccess);

    // We are "fetching" if we are online AND the online query is running,
    // (This includes the background revalidation)
    const isFetching = isOnline && onlineQuery.isFetching;

    const resolvedData = data?.data
        ? Array.isArray(data.data)
            ? data.data.map((item) => ({ ...item, source: data.source }))
            : { ...data.data, source: data.source }
        : undefined;

    return {
        data: resolvedData as UseWordSearchResult["data"],
        isLoading,    // Use this for the main page skeleton
        isFetching,   // Use this for the small loading icon
        isError,      // Use this for "Not Found"
        isOnline,     // Use this to decide between loading icon and wifi-off icon
        offlineStatus: offlineMetadata?.status ?? "checking",
        hasOfflineDataset,
        isOfflineLoading,
        offlineError: (offlineWordError ?? offlineMetadataError) as Error | null,
        error: onlineQuery.error as Error | null,
    };
}
