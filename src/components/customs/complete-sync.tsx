"use client";

import { useEffect } from "react";
import { api } from "@/src/trpc/react";
import {
    getLocalAutocompleteVersion,
    updateLocalAutocompleteList,
} from "@/src/lib/offline-db";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { emitAutocompleteSyncStatus } from "@/src/lib/autocomplete-sync-status";

/**
 * This component runs in the background on app load.
 * It checks if the local autocomplete list is stale
 * and updates it if necessary.
 */
export function AutocompleteSync() {
    const isOnline = useOnlineStatus();
    // Get the tRPC client
    const trpcClient = api.useUtils().client;

    // 1. Get the server's version
    const { data: serverVersion } =
        api.word.getAutocompleteListVersion.useQuery(undefined, {
            enabled: isOnline,
        });

    // 2. This effect runs when the serverVersion is loaded
    useEffect(() => {
        if (!isOnline || !serverVersion) return; // Wait for the query to finish

        const syncData = async () => {
            const normalizedServerVersion = String(serverVersion);
            // 3. Get our local version
            const localVersion = await getLocalAutocompleteVersion();

            // 4. Compare versions
            if (localVersion === normalizedServerVersion) {
                emitAutocompleteSyncStatus("ready");
                return; // All good!
            }

            // 5. Versions are different. Fetch and update.
            try {
                emitAutocompleteSyncStatus("downloading");
                // Use the tRPC client for a one-off call
                const wordList = await trpcClient.word.getAllWordNames.query();

                // 6. Save new data
                await updateLocalAutocompleteList(wordList, normalizedServerVersion);
                emitAutocompleteSyncStatus("ready");
            } catch (error) {
                console.error("[AutocompleteSync] Failed to sync word list:", error);
                emitAutocompleteSyncStatus("error");
            }
        };

        syncData();
    }, [isOnline, serverVersion, trpcClient]);

    return null; // This component renders nothing
}
