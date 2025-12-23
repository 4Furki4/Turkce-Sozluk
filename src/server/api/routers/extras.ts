import { createTRPCRouter, publicProcedure } from "@/src/server/api/trpc";
import { z } from "zod";
import { db } from "@/db";
import { galatiMeshur } from "@/db/schema/galatimeshur"; // Updated import
import { misspellings } from "@/db/schema/misspellings";
import { words } from "@/db/schema/words";
import { eq, sql } from "drizzle-orm";

export const extrasRouter = createTRPCRouter({
    getGalatiMeshur: publicProcedure
        .input(z.object({ limit: z.number().default(1), offset: z.number().default(0) }))
        .query(async ({ input }) => {
            // Get total count
            const totalCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(galatiMeshur)
                .then((res) => Number(res[0]?.count ?? 0));

            // Fetch Galat-ı Meşhur entries with offset
            const results = await db
                .select({
                    id: galatiMeshur.id,
                    word: words.name,
                    explanation: galatiMeshur.explanation,
                    correctUsage: galatiMeshur.correctUsage,
                })
                .from(galatiMeshur)
                .innerJoin(words, eq(galatiMeshur.wordId, words.id))
                .orderBy(galatiMeshur.id) // Valid order for pagination
                .limit(input.limit)
                .offset(input.offset);

            return {
                data: results,
                total: totalCount,
            };
        }),

    getMisspellings: publicProcedure
        .input(z.object({ limit: z.number().default(1), offset: z.number().default(0) }))
        .query(async ({ input }) => {
            // Get total count
            const totalCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(misspellings)
                .then((res) => Number(res[0]?.count ?? 0));

            // Fetch misspellings with offset
            const results = await db
                .select({
                    id: misspellings.id,
                    wrong: misspellings.incorrectSpelling,
                    correct: words.name,
                })
                .from(misspellings)
                .innerJoin(words, eq(misspellings.correctWordId, words.id))
                .orderBy(misspellings.id) // Valid order for pagination
                .limit(input.limit)
                .offset(input.offset);

            return {
                data: results,
                total: totalCount,
            };
        }),

    getGalatiMeshurById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const result = await db
                .select({
                    id: galatiMeshur.id,
                    word: words.name,
                    explanation: galatiMeshur.explanation,
                    correctUsage: galatiMeshur.correctUsage,
                    createdAt: galatiMeshur.createdAt,
                })
                .from(galatiMeshur)
                .innerJoin(words, eq(galatiMeshur.wordId, words.id))
                .where(eq(galatiMeshur.id, input.id))
                .limit(1);

            return result[0] || null;
        }),
});