import { getRateLimitRetryAt, isRateLimitError } from "@/src/lib/rate-limit-error";

/** Expected throttling is renderable state; other failures still reach the error boundary. */
export async function readWithRateLimit<T>(read: () => Promise<T>): Promise<
    { data: T; rateLimited: false; retryAt?: never } | { data: undefined; rateLimited: true; retryAt: number }
> {
    try {
        return { data: await read(), rateLimited: false };
    } catch (error) {
        if (!isRateLimitError(error)) throw error;
        return { data: undefined, rateLimited: true, retryAt: getRateLimitRetryAt(error) ?? Date.now() + 10_000 };
    }
}
