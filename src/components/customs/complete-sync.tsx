"use client";

import { useEffect } from "react";
import { api } from "@/src/trpc/react";
import {
    getLocalAutocompleteVersion,
    updateLocalAutocompleteList,
} from "@/src/lib/offline-db";

/**
 * This component runs in the background on app load.
 * It checks if the local autocomplete list is stale
 * and updates it if necessary.
 */
export function AutocompleteSync() {
    // Get the tRPC client
    const trpcClient = api.useUtils().client;

    // 1. Get the server's version
    const { data: serverVersion } =
        api.word.getAutocompleteListVersion.useQuery();

    // 2. This effect runs when the serverVersion is loaded
    useEffect(() => {
        if (!serverVersion) return; // Wait for the query to finish

        const syncData = async () => {
            // 3. Get our local version
            const localVersion = await getLocalAutocompleteVersion();

            console.log(`[AutocompleteSync] Server version: ${serverVersion}`);
            console.log(`[AutocompleteSync] Local version: ${localVersion}`);

            // 4. Compare versions
            if (localVersion === serverVersion) {
                console.log("[AutocompleteSync] Autocomplete data is up to date.");
                return; // All good!
            }

            // 5. Versions are different. Fetch and update.
            console.log("[AutocompleteSync] Stale data. Fetching new list...");
            try {
                // Use the tRPC client for a one-off call
                const wordList = await trpcClient.word.getAllWordNames.query();

                // 6. Save new data
                await updateLocalAutocompleteList(wordList, serverVersion);

                console.log(
                    `[AutocompleteSync] Synced ${wordList.length} words.`,
                );
            } catch (error) {
                console.error("[AutocompleteSync] Failed to sync word list:", error);
            }
        };

        syncData();
    }, [serverVersion, trpcClient]);

    return null; // This component renders nothing
}