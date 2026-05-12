export const popularWordPeriods = ["allTime", "last7Days", "last30Days"] as const;

export type PopularWordPeriod = (typeof popularWordPeriods)[number];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getPopularWordsCutoff(period: PopularWordPeriod, now = new Date()) {
  if (period === "last7Days") {
    return new Date(now.getTime() - 7 * DAY_IN_MS);
  }

  if (period === "last30Days") {
    return new Date(now.getTime() - 30 * DAY_IN_MS);
  }

  return null;
}

export function shouldFallbackToAllTimeViews(period: PopularWordPeriod) {
  return period === "allTime";
}
