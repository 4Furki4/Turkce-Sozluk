/**
 * Related words/phrases request handlers
 * Separated from main request router for better organization
 */
import { requests } from "@/db/schema/requests";
import { protectedProcedure } from "../../trpc";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { relatedWords } from "@/db/schema/related_words";
import { relatedPhrases } from "@/db/schema/related_phrases";
import { TRPCError } from "@trpc/server";
import { verifyRecaptcha } from "@/src/lib/recaptcha";

export const relatedItemsHandlers = {
    requestEditRelatedWord: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            relatedWordId: z.number(),
            originalRelationType: z.string().min(1),
            newRelationType: z.string().min(1),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { wordId, relatedWordId, originalRelationType, newRelationType, reason, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const existingRelation = await db.query.relatedWords.findFirst({
                where: and(
                    eq(relatedWords.wordId, wordId),
                    eq(relatedWords.relatedWordId, relatedWordId)
                ),
                columns: {
                    relationType: true
                }
            });

            if (!existingRelation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Original related word entry not found."
                });
            }

            if (existingRelation.relationType !== originalRelationType) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "The relation type of this word has changed. Please refresh the page and try again."
                });
            }

            await db.insert(requests).values({
                userId: user.id,
                entityType: "related_words",
                entityId: wordId,
                action: "update",
                newData: {
                    relatedWordId: relatedWordId,
                    originalRelationType: originalRelationType,
                    newRelationType: newRelationType
                },
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related word edit request submitted." };
        }),

    requestDeleteRelatedWord: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            relatedWordId: z.number(),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { wordId, relatedWordId, reason, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const existingRelation = await db.query.relatedWords.findFirst({
                where: and(
                    eq(relatedWords.wordId, wordId),
                    eq(relatedWords.relatedWordId, relatedWordId)
                )
            });

            if (!existingRelation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Related word entry not found, cannot request deletion."
                });
            }

            await db.insert(requests).values({
                userId: user.id,
                entityType: "related_words",
                entityId: wordId,
                action: "delete",
                newData: {
                    relatedWordId: relatedWordId,
                    originalRelationType: existingRelation.relationType
                },
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related word deletion request submitted." };
        }),

    requestCreateRelatedWord: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            relatedWordId: z.number(),
            relationType: z.string(),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { wordId, relatedWordId, relationType, reason, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const existingRelation = await db.query.relatedWords.findFirst({
                where: and(
                    eq(relatedWords.wordId, wordId),
                    eq(relatedWords.relatedWordId, relatedWordId)
                )
            });

            if (existingRelation) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "This related word entry already exists."
                });
            }

            await db.insert(requests).values({
                userId: user.id,
                entityType: "related_words",
                entityId: wordId,
                action: "create",
                newData: {
                    relatedWordId: relatedWordId,
                    relationType: relationType
                },
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related word creation request submitted." };
        }),

    requestEditRelatedPhrase: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            oldRelatedPhraseId: z.number(),
            newRelatedPhraseId: z.number(),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { wordId, oldRelatedPhraseId, newRelatedPhraseId, reason, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            await ctx.db.insert(requests).values({
                userId: ctx.session.user.id,
                entityType: "related_phrases",
                entityId: wordId,
                action: "update",
                newData: {
                    oldRelatedPhraseId: oldRelatedPhraseId,
                    newRelatedPhraseId: newRelatedPhraseId,
                },
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related phrase edit request submitted." };
        }),

    requestCreateRelatedPhrase: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            phraseId: z.number(),
            description: z.string().optional(),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input: { wordId, phraseId, description, reason, captchaToken }, ctx: { db, session: { user } } }) => {
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const existingPhrase = await db.query.relatedPhrases.findFirst({
                where: and(
                    eq(relatedPhrases.wordId, wordId),
                    eq(relatedPhrases.relatedPhraseId, phraseId)
                )
            });

            if (existingPhrase) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "This related phrase already exists for this word."
                });
            }

            const existingRequest = await db.query.requests.findFirst({
                where: and(
                    eq(requests.entityType, "related_phrases"),
                    eq(requests.action, "create"),
                    eq(requests.status, "pending"),
                    eq(requests.entityId, wordId),
                    sql`"new_data"->>'phraseId' = ${String(phraseId)}`
                )
            });

            if (existingRequest) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "A request for this related phrase already exists and is pending."
                });
            }

            const dataToStore: { phraseId: number; description?: string; } = {
                phraseId: phraseId,
            };
            if (description) {
                dataToStore.description = description;
            }

            await db.insert(requests).values({
                userId: user.id,
                entityType: "related_phrases",
                entityId: wordId,
                action: "create",
                newData: dataToStore,
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related phrase creation request submitted." };
        }),

    requestDeleteRelatedPhrase: protectedProcedure
        .input(z.object({
            wordId: z.number(),
            relatedPhraseId: z.number(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { wordId, relatedPhraseId, reason } = input;

            const existingRelation = await db.query.relatedPhrases.findFirst({
                where: and(
                    eq(relatedPhrases.wordId, wordId),
                    eq(relatedPhrases.relatedPhraseId, relatedPhraseId)
                )
            });

            if (!existingRelation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Related phrase entry not found, cannot request deletion."
                });
            }

            await db.insert(requests).values({
                userId: user.id,
                entityType: "related_phrases",
                entityId: wordId,
                action: "delete",
                newData: { relatedPhraseId },
                status: "pending",
                reason: reason,
                requestDate: new Date(),
            });

            return { success: true, message: "Related phrase deletion request submitted." };
        }),
};
