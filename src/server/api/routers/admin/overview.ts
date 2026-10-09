import { feedbacks } from "@/db/schema/feedbacks";
import { requests } from "@/db/schema/requests";
import { searchLogs } from "@/db/schema/search_logs";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { adminProcedure, createTRPCRouter } from "@/src/server/api/trpc";
import { count, desc, eq, gte, sql } from "drizzle-orm";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const overviewAdminRouter = createTRPCRouter({
  getDashboardOverview: adminProcedure.query(async ({ ctx }) => {
    const todayStart = startOfDay(new Date());
    const last7DaysStart = addDays(todayStart, -6);
    const last14DaysStart = addDays(todayStart, -13);
    const tomorrowStart = addDays(todayStart, 1);

    const [
      totalWordsResult,
      totalUsersResult,
      searchCounts,
      pendingRequestsResult,
      openFeedbackResult,
      dailySearchRows,
      topSearchRows,
    ] = await Promise.all([
      ctx.db.select({ count: count() }).from(words),
      ctx.db.select({ count: count() }).from(users),
      ctx.db.select({
        total: count(),
        today: sql<number>`count(*) filter (where ${searchLogs.searchTimestamp} >= ${todayStart.toISOString()})`.mapWith(Number),
        authenticated: sql<number>`count(*) filter (where ${searchLogs.userId} is not null)`.mapWith(Number),
        anonymous: sql<number>`count(*) filter (where ${searchLogs.userId} is null)`.mapWith(Number),
      }).from(searchLogs).where(gte(searchLogs.searchTimestamp, last7DaysStart)),
      ctx.db.select({ count: count() }).from(requests).where(eq(requests.status, "pending")),
      ctx.db.select({ count: count() }).from(feedbacks).where(eq(feedbacks.status, "open")),
      ctx.db
        .select({
          date: sql<string>`to_char(${searchLogs.searchTimestamp}, 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(searchLogs)
        .where(gte(searchLogs.searchTimestamp, last14DaysStart))
        .groupBy(sql`to_char(${searchLogs.searchTimestamp}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${searchLogs.searchTimestamp}, 'YYYY-MM-DD')`),
      ctx.db
        .select({
          wordId: words.id,
          wordName: words.name,
          count: count(searchLogs.id),
        })
        .from(searchLogs)
        .innerJoin(words, eq(searchLogs.wordId, words.id))
        .where(gte(searchLogs.searchTimestamp, last7DaysStart))
        .groupBy(words.id, words.name)
        .orderBy(desc(count(searchLogs.id)))
        .limit(8),
    ]);

    const dailyCountMap = new Map(dailySearchRows.map((row) => [row.date, row.count]));
    const dailySearches = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(last14DaysStart, index);
      const key = toDateKey(date);

      return {
        date: key,
        count: dailyCountMap.get(key) ?? 0,
      };
    });

    return {
      generatedAt: new Date(),
      windows: {
        todayStart,
        tomorrowStart,
        last7DaysStart,
        last14DaysStart,
      },
      metrics: {
        totalWords: totalWordsResult[0]?.count ?? 0,
        totalUsers: totalUsersResult[0]?.count ?? 0,
        searchesToday: searchCounts[0]?.today ?? 0,
        searchesLast7Days: searchCounts[0]?.total ?? 0,
        pendingRequests: pendingRequestsResult[0]?.count ?? 0,
        openFeedback: openFeedbackResult[0]?.count ?? 0,
      },
      searchAnalytics: {
        dailySearches,
        topSearchedWords: topSearchRows.map((row) => ({
          wordId: row.wordId,
          wordName: row.wordName,
          count: row.count,
        })),
        actorSplit: {
          total: searchCounts[0]?.total ?? 0,
          authenticated: searchCounts[0]?.authenticated ?? 0,
          anonymous: searchCounts[0]?.anonymous ?? 0,
        },
      },
    };
  }),
});
