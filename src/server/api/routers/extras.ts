import { createTRPCRouter, publicProcedure } from "@/src/server/api/trpc";
import { z } from "zod";
import { db } from "@/db";
import { galatiMeshur } from "@/db/schema/galatimeshur"; // Updated import
import { misspellings } from "@/db/schema/misspellings";
import { words } from "@/db/schema/words";
import { eq, sql } from "drizzle-orm";

export const extrasRouter = createTRPCRouter({
    getGalatiMeshur: publicProcedure
        .input(z.object({ limit: z.number().default(1) }))
        .query(async ({ input }) => {
            // Fetch random Galat-ı Meşhur entries
            const results = await db
                .select({
                    id: galatiMeshur.id,
                    word: words.name,
                    explanation: galatiMeshur.explanation,
                    correctUsage: galatiMeshur.correctUsage,
                })
                .from(galatiMeshur)
                .innerJoin(words, eq(galatiMeshur.wordId, words.id))
                .orderBy(sql`RANDOM()`)
                .limit(input.limit);

            return results;
        }),

    getMisspellings: publicProcedure
        .input(z.object({ limit: z.number().default(5) }))
        .query(async ({ input }) => {
            // Fetch random or most frequent misspellings
            const results = await db
                .select({
                    id: misspellings.id,
                    wrong: misspellings.incorrectSpelling,
                    correct: words.name,
                })
                .from(misspellings)
                .innerJoin(words, eq(misspellings.correctWordId, words.id))
                .orderBy(sql`RANDOM()`) // Or desc(misspellings.frequency)
                .limit(input.limit);

            return results;
        }),
});