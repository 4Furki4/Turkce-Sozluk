import {
    defaultShouldDehydrateQuery,
    MutationCache,
    QueryCache,
    QueryClient,
    onlineManager,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { toast } from "sonner";
import { RateLimitToast } from "../components/customs/rate-limit-toast";

if (typeof window !== "undefined") {
    onlineManager.setOnline(navigator.onLine);
}

export const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                // With SSR, we usually want to set some default staleTime
                // above 0 to avoid refetching immediately on the client
                staleTime: 30 * 1000,
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
            onError: (error: any) => {
                if (error?.data?.code === "TOO_MANY_REQUESTS") {
                    toast.error(<RateLimitToast />);
                }
            },
        }),
        // Global Error Handler for Queries (Reads)
        queryCache: new QueryCache({
            onError: (error: any) => {
                if (error?.data?.code === "TOO_MANY_REQUESTS") {
                    toast.error(<RateLimitToast />);
                }
            },
        }),
    });
