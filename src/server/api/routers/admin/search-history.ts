import { searchLogs } from "@/db/schema/search_logs";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { adminProcedure, createTRPCRouter } from "@/src/server/api/trpc";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

export const searchHistoryAdminRouter = createTRPCRouter({
    list: adminProcedure
        .input(z.object({
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(100).default(20),
            wordQuery: z.string().trim().optional(),
            userQuery: z.string().trim().optional(),
            actor: z.enum(["all", "authenticated", "anonymous"]).default("all"),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            sortOrder: z.enum(["asc", "desc"]).default("desc"),
        }))
        .query(async ({ ctx, input }) => {
            const offset = (input.page - 1) * input.limit;
            const inclusiveEndDate = input.endDate ? new Date(input.endDate) : undefined;
            inclusiveEndDate?.setHours(23, 59, 59, 999);

            const whereConditions = and(
                input.wordQuery
                    ? ilike(words.name, `%${input.wordQuery}%`)
                    : undefined,
                input.userQuery
                    ? or(
                        ilike(users.name, `%${input.userQuery}%`),
                        ilike(users.username, `%${input.userQuery}%`),
                        ilike(users.email, `%${input.userQuery}%`),
                        ilike(users.id, `%${input.userQuery}%`),
                    )
                    : undefined,
                input.actor === "authenticated" ? isNotNull(searchLogs.userId) : undefined,
                input.actor === "anonymous" ? isNull(searchLogs.userId) : undefined,
                input.startDate ? gte(searchLogs.searchTimestamp, input.startDate) : undefined,
                inclusiveEndDate ? lte(searchLogs.searchTimestamp, inclusiveEndDate) : undefined,
            );

            const orderBy = input.sortOrder === "desc"
                ? desc(searchLogs.searchTimestamp)
                : asc(searchLogs.searchTimestamp);

            const entries = await ctx.db
                .select({
                    id: searchLogs.id,
                    wordId: words.id,
                    wordName: words.name,
                    searchedAt: searchLogs.searchTimestamp,
                    user: {
                        id: users.id,
                        name: users.name,
                        username: users.username,
                        image: users.image,
                    },
                })
                .from(searchLogs)
                .innerJoin(words, eq(searchLogs.wordId, words.id))
                .leftJoin(users, eq(searchLogs.userId, users.id))
                .where(whereConditions)
                .orderBy(orderBy)
                .limit(input.limit)
                .offset(offset);

            const totalResult = await ctx.db
                .select({ count: count() })
                .from(searchLogs)
                .innerJoin(words, eq(searchLogs.wordId, words.id))
                .leftJoin(users, eq(searchLogs.userId, users.id))
                .where(whereConditions);

            const totalCount = totalResult[0]?.count ?? 0;

            return {
                entries,
                totalCount,
                totalPages: Math.ceil(totalCount / input.limit),
            };
        }),
});
