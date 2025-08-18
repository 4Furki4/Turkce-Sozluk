import { and, eq } from "drizzle-orm";
import { relatedPhrases } from "@/db/schema/related_phrases";
import { RequestHandler, RequestHandlerContext } from "./types";
import { TRPCError } from "@trpc/server";

interface RelatedPhraseData {
    // For delete
    relatedPhraseId?: number;
    // For create
    phraseId?: number;
    description?: string;
    // For update
    oldRelatedPhraseId?: number;
    newRelatedPhraseId?: number;
}

export class CreateRelatedPhraseHandler implements RequestHandler<void> {
    async handle(context: RequestHandlerContext): Promise<void> {
        const { tx, request } = context;
        const { entityId: wordId, newData } = request;

        if (wordId === null || wordId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Word ID (entityId) is missing in the request for related phrase creation.",
            });
        }

        const { phraseId } = newData as RelatedPhraseData;
        if (phraseId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing phraseId in newData for related phrase creation.",
            });
        }

        // Ensure not duplicating an existing relation
        const existing = await tx
            .select()
            .from(relatedPhrases)
            .where(
                and(
                    eq(relatedPhrases.wordId, wordId),
                    eq(relatedPhrases.relatedPhraseId, phraseId)
                )
            );
        if (existing.length > 0) {
            throw new TRPCError({ code: "CONFLICT", message: "This related phrase already exists for this word." });
        }

        await tx.insert(relatedPhrases).values({
            wordId,
            relatedPhraseId: phraseId,
            // description is not stored in related_phrases schema; if needed, it belongs elsewhere
        });
    }
}

export class UpdateRelatedPhraseHandler implements RequestHandler<void> {
    async handle(context: RequestHandlerContext): Promise<void> {
        const { tx, request } = context;
        const { entityId: wordId, newData } = request;

        if (wordId === null || wordId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Word ID (entityId) is missing in the request for related phrase update.",
            });
        }

        const { oldRelatedPhraseId, newRelatedPhraseId } = newData as RelatedPhraseData;
        if (oldRelatedPhraseId === undefined || newRelatedPhraseId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing oldRelatedPhraseId or newRelatedPhraseId in newData for related phrase update.",
            });
        }

        const result = await tx
            .update(relatedPhrases)
            .set({
                relatedPhraseId: newRelatedPhraseId,
                updatedAt: new Date().toISOString().split('T')[0],
            })
            .where(
                and(
                    eq(relatedPhrases.wordId, wordId),
                    eq(relatedPhrases.relatedPhraseId, oldRelatedPhraseId)
                )
            );

        if (result.count === 0) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: `Related phrase entry not found for wordId: ${wordId} and relatedPhraseId: ${oldRelatedPhraseId}. Update failed.`,
            });
        }
    }
}

export class DeleteRelatedPhraseHandler implements RequestHandler<void> {
    async handle(context: RequestHandlerContext): Promise<void> {
        const { tx, request } = context;
        const { entityId: wordId, newData } = request;

        if (wordId === null || wordId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Word ID (entityId) is missing in the request for related phrase deletion.",
            });
        }

        const parsedNewData = newData as Pick<RelatedPhraseData, 'relatedPhraseId'>;
        const { relatedPhraseId } = parsedNewData;

        if (relatedPhraseId === undefined) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing relatedPhraseId in newData for related phrase deletion.",
            });
        }

        await tx
            .delete(relatedPhrases)
            .where(
                and(
                    eq(relatedPhrases.wordId, wordId),
                    eq(relatedPhrases.relatedPhraseId, relatedPhraseId)
                )
            );
    }
}
