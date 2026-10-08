/** tRPC exposes the code directly on the server and under data in the browser. */
export function isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    if ("code" in error && error.code === "TOO_MANY_REQUESTS") return true;
    return "data" in error && error.data !== null && typeof error.data === "object"
        && "code" in error.data && error.data.code === "TOO_MANY_REQUESTS";
}

/** Millisecond retry deadline supplied by the limiter, on either side of tRPC. */
export function getRateLimitRetryAt(error: unknown): number | undefined {
    if (!isRateLimitError(error)) return undefined;
    const rateLimit = error as { retryAt?: unknown; data?: { retryAt?: unknown } };
    const value = rateLimit.data?.retryAt ?? rateLimit.retryAt;
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
