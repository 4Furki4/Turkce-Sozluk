import {
    defaultShouldDehydrateQuery,
    MutationCache,
    QueryCache,
    QueryClient,
    onlineManager,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { showRateLimitToast } from "../components/customs/rate-limit-toast";
import { getRateLimitRetryAt, isRateLimitError } from "@/src/lib/rate-limit-error";

if (typeof window !== "undefined") {
    onlineManager.setOnline(navigator.onLine);
}

export const createQueryClient = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                // With SSR, we usually want to set some default staleTime
                // above 0 to avoid refetching immediately on the client
                staleTime: 30 * 1000,
                // Retrying a 429 immediately only consumes more quota. Preserve normal retries.
                retry: (failureCount, error) => !isRateLimitError(error)
                    && failureCount < (typeof window === "undefined" ? 0 : 3),
            },
            mutations: {
                networkMode: "online",
            },
            dehydrate: {
                serializeData: SuperJSON.serialize,
                shouldDehydrateQuery: (query) =>
                    defaultShouldDehydrateQuery(query) ||
                    query.state.status === "pending",
            },
            hydrate: {
                deserializeData: SuperJSON.deserialize,
            },
        },
        // Global Error Handler for Mutations (Writes)
        mutationCache: new MutationCache({
            onError: (error) => {
                if (typeof window !== "undefined" && isRateLimitError(error)) {
                    showRateLimitToast({ retryAt: getRateLimitRetryAt(error) });
                }
            },
        }),
        // Global Error Handler for Queries (Reads)
        queryCache: new QueryCache({
            onError: (error) => {
                if (typeof window !== "undefined" && isRateLimitError(error)) {
                    showRateLimitToast({ retryAt: getRateLimitRetryAt(error), retry: () => {
                        void queryClient.refetchQueries({
                            type: "active",
                            predicate: (query) => isRateLimitError(query.state.error),
                        });
                    } });
                }
            },
        }),
    });
    return queryClient;
};
