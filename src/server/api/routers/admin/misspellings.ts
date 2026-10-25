import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../trpc";
import { misspellings } from "@/db/schema/misspellings";
import { words } from "@/db/schema/words";
import { eq, desc } from "drizzle-orm";
import { MisspellingSchema } from "../../schemas/admin";
import { TRPCError } from "@trpc/server";

export const misspellingsAdminRouter = createTRPCRouter({
    getById: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx: { db }, input }) => {
      const [item] = await db.select({ id: misspellings.id, correctWordId: misspellings.correctWordId, incorrectSpelling: misspellings.incorrectSpelling, correctWordName: words.name }).from(misspellings).innerJoin(words, eq(misspellings.correctWordId, words.id)).where(eq(misspellings.id, input.id));
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),
    getMisspellings: adminProcedure
        .input(z.object({
            limit: z.number().int().min(1).max(100).default(10),
            offset: z.number().int().min(0).max(1000000).default(0),
            id: z.number().int().positive().max(2147483647).optional(),
        }))
        .query(async ({ ctx: { db }, input }) => {
            const results = await db
                .select({
                    id: misspellings.id,
                    correctWordId: misspellings.correctWordId,
                    correctWordName: words.name,
                    incorrectSpelling: misspellings.incorrectSpelling,
                })
                .from(misspellings)
                .innerJoin(words, eq(misspellings.correctWordId, words.id))
                .where(input.id ? eq(misspellings.id, input.id) : undefined)
                .orderBy(desc(misspellings.id))
                .limit(input.limit)
                .offset(input.id ? 0 : input.offset);

            const total = await db.$count(misspellings, input.id ? eq(misspellings.id, input.id) : undefined);

            return {
                data: results,
                total,
            };
        }),

    addMisspelling: adminProcedure
        .input(MisspellingSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                return await db.insert(misspellings).values({
                    correctWordId: input.correctWordId,
                    incorrectSpelling: input.incorrectSpelling,
                }).returning();
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to add misspelling",
                    cause: error,
                });
            }
        }),

    updateMisspelling: adminProcedure
        .input(MisspellingSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            if (!input.id) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "ID is required for update",
                });
            }
            try {
                await db.update(misspellings)
                    .set({
                        correctWordId: input.correctWordId,
                        incorrectSpelling: input.incorrectSpelling,
                    })
                    .where(eq(misspellings.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update misspelling",
                    cause: error,
                });
            }
        }),

    deleteMisspelling: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                await db.delete(misspellings).where(eq(misspellings.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to delete misspelling",
                    cause: error,
                });
            }
        }),
});
