import type { CachedPopularData } from "./db-config";

export const POPULAR_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export function isUsableCachedPopularData(
    cached: CachedPopularData | undefined,
    period: NonNullable<CachedPopularData["period"]>,
    now = Date.now()
): cached is CachedPopularData {
    if (!cached || cached.period !== period) {
        return false;
    }

    return now - cached.timestamp <= POPULAR_CACHE_MAX_AGE;
}
