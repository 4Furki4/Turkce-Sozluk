import {
  getPopularWordsCutoff,
  shouldFallbackToAllTimeViews,
} from "../word-popularity";

describe("word popularity period behavior", () => {
  const now = new Date("2026-05-12T12:00:00.000Z");

  it("only allows all-time view-count fallback for all-time requests", () => {
    expect(shouldFallbackToAllTimeViews("allTime")).toBe(true);
    expect(shouldFallbackToAllTimeViews("last7Days")).toBe(false);
    expect(shouldFallbackToAllTimeViews("last30Days")).toBe(false);
  });

  it("computes cutoffs only for bounded trending periods", () => {
    expect(getPopularWordsCutoff("allTime", now)).toBeNull();
    expect(getPopularWordsCutoff("last7Days", now)?.toISOString()).toBe(
      "2026-05-05T12:00:00.000Z",
    );
    expect(getPopularWordsCutoff("last30Days", now)?.toISOString()).toBe(
      "2026-04-12T12:00:00.000Z",
    );
  });
});
