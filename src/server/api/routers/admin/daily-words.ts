import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../trpc";
import { dailyWords } from "@/db/schema/daily-words";
import { words } from "@/db/schema/words";
import { eq, desc } from "drizzle-orm";
import { DailyWordSchema } from "../../schemas/admin";
import { TRPCError } from "@trpc/server";

export const dailyWordsAdminRouter = createTRPCRouter({
    getDailyWords: adminProcedure
        .input(z.object({
            limit: z.number().default(10),
            offset: z.number().default(0),
        }))
        .query(async ({ ctx: { db }, input }) => {
            const results = await db
                .select({
                    id: dailyWords.id,
                    date: dailyWords.date,
                    wordId: dailyWords.wordId,
                    wordName: words.name,
                })
                .from(dailyWords)
                .innerJoin(words, eq(dailyWords.wordId, words.id))
                .orderBy(desc(dailyWords.date))
                .limit(input.limit)
                .offset(input.offset);

            const total = await db.$count(dailyWords);

            return {
                data: results,
                total,
            };
        }),

    addDailyWord: adminProcedure
        .input(DailyWordSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                await db.insert(dailyWords).values({
                    wordId: input.wordId,
                    date: input.date,
                });
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to add daily word",
                    cause: error,
                });
            }
        }),

    updateDailyWord: adminProcedure
        .input(DailyWordSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            if (!input.id) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "ID is required for update",
                });
            }
            try {
                await db.update(dailyWords)
                    .set({
                        wordId: input.wordId,
                        date: input.date,
                    })
                    .where(eq(dailyWords.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update daily word",
                    cause: error,
                });
            }
        }),

    deleteDailyWord: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                await db.delete(dailyWords).where(eq(dailyWords.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to delete daily word",
                    cause: error,
                });
            }
        }),
});
