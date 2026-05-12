import { isUsableCachedPopularData, POPULAR_CACHE_MAX_AGE } from "../popular-cache";
import type { CachedPopularData } from "../db-config";

describe("popular cache period guard", () => {
    const now = 1_000_000;
    const cached: CachedPopularData = {
        key: "trending-7days",
        data: [{ id: 1, name: "test" }],
        timestamp: now - 1000,
        period: "last7Days",
    };

    it("accepts fresh cache entries for the requested period", () => {
        expect(isUsableCachedPopularData(cached, "last7Days", now)).toBe(true);
    });

    it("rejects entries without matching period metadata", () => {
        expect(isUsableCachedPopularData(cached, "last30Days", now)).toBe(false);
        expect(
            isUsableCachedPopularData({ ...cached, period: undefined }, "last7Days", now),
        ).toBe(false);
    });

    it("rejects expired cache entries", () => {
        expect(
            isUsableCachedPopularData(
                { ...cached, timestamp: now - POPULAR_CACHE_MAX_AGE - 1 },
                "last7Days",
                now,
            ),
        ).toBe(false);
    });
});
