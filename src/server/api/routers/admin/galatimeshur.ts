import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../trpc";
import { galatiMeshur } from "@/db/schema/galatimeshur";
import { words } from "@/db/schema/words";
import { eq, desc } from "drizzle-orm";
import { GalatiMeshurSchema } from "../../schemas/admin";
import { TRPCError } from "@trpc/server";

export const galatiMeshurAdminRouter = createTRPCRouter({
    getGalatiMeshur: adminProcedure
        .input(z.object({
            limit: z.number().default(10),
            offset: z.number().default(0),
        }))
        .query(async ({ ctx: { db }, input }) => {
            const results = await db
                .select({
                    id: galatiMeshur.id,
                    wordId: galatiMeshur.wordId,
                    wordName: words.name,
                    explanation: galatiMeshur.explanation,
                    correctUsage: galatiMeshur.correctUsage,
                })
                .from(galatiMeshur)
                .innerJoin(words, eq(galatiMeshur.wordId, words.id))
                .orderBy(desc(galatiMeshur.id))
                .limit(input.limit)
                .offset(input.offset);

            const total = await db.$count(galatiMeshur);

            return {
                data: results,
                total,
            };
        }),

    addGalatiMeshur: adminProcedure
        .input(GalatiMeshurSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                await db.insert(galatiMeshur).values({
                    wordId: input.wordId,
                    explanation: input.explanation,
                    correctUsage: input.correctUsage,
                });
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to add Galatımeşhur",
                    cause: error,
                });
            }
        }),

    updateGalatiMeshur: adminProcedure
        .input(GalatiMeshurSchema)
        .mutation(async ({ ctx: { db }, input }) => {
            if (!input.id) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "ID is required for update",
                });
            }
            try {
                await db.update(galatiMeshur)
                    .set({
                        wordId: input.wordId,
                        explanation: input.explanation,
                        correctUsage: input.correctUsage,
                    })
                    .where(eq(galatiMeshur.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update Galatımeşhur",
                    cause: error,
                });
            }
        }),

    deleteGalatiMeshur: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx: { db }, input }) => {
            try {
                await db.delete(galatiMeshur).where(eq(galatiMeshur.id, input.id));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to delete Galatımeşhur",
                    cause: error,
                });
            }
        }),
});
