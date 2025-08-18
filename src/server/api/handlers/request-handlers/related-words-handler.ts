// src/server/api/handlers/request-handlers/related-words-handler.ts
import { and, eq } from "drizzle-orm";
import { relatedWords } from "@/db/schema/related_words";
import { RequestHandler, RequestHandlerContext } from "./types";
import { TRPCError } from "@trpc/server";

interface RelatedWordData {
  relatedWordId?: number;
  relationType?: string;
  newRelationType?: string;
  // Add other fields from related_words table if they can be part of the request's newData
}

export class CreateRelatedWordHandler implements RequestHandler<void> {
  async handle({ tx, request }: RequestHandlerContext): Promise<void> {
    const wordId = request.entityId;
    if (wordId === null || wordId === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Word ID (entityId) is missing in the request for related word creation.",
      });
    }

    const { relatedWordId, relationType } = (request.newData as RelatedWordData);
    if (relatedWordId === undefined || relationType === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing relatedWordId or relationType in newData for related word creation.",
      });
    }

    // Ensure not duplicating an existing relation
    const existing = await tx
      .select()
      .from(relatedWords)
      .where(and(eq(relatedWords.wordId, wordId), eq(relatedWords.relatedWordId, relatedWordId)));
    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "This related word entry already exists." });
    }

    await tx.insert(relatedWords).values({
      wordId,
      relatedWordId,
      relationType,
      userId: request.userId,
    });
  }
}

export class UpdateRelatedWordHandler implements RequestHandler<void> {
  async handle(context: RequestHandlerContext): Promise<void> {
    const { tx, request } = context;
    const { entityId: wordId, newData } = request;

    if (wordId === null || wordId === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Word ID (entityId) is missing in the request for related word update.",
      });
    }

    const parsedNewData = newData as RelatedWordData;
    const { relatedWordId, newRelationType } = parsedNewData;

    if (relatedWordId === undefined || newRelationType === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing relatedWordId or newRelationType in newData for related word update.",
      });
    }

    // Ensure the relationType is a valid one if you have an enum or specific list
    // For now, we assume newRelationType is a string that's already validated or will be handled by the DB schema

    const result = await tx
      .update(relatedWords)
      .set({ relationType: newRelationType, updatedAt: new Date().toISOString().split('T')[0] }) // Also update updatedAt
      .where(
        and(
          eq(relatedWords.wordId, wordId),
          eq(relatedWords.relatedWordId, relatedWordId)
        )
      );

    if (result.count === 0) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: `Related word entry not found for wordId: ${wordId} and relatedWordId: ${relatedWordId}. Update failed.`,
        });
    }
  }
}

export class DeleteRelatedWordHandler implements RequestHandler<void> {
  async handle(context: RequestHandlerContext): Promise<void> {
    const { tx, request } = context;
    const { entityId: wordId, newData } = request;

    if (wordId === null || wordId === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Word ID (entityId) is missing in the request for related word deletion.",
      });
    }

    const parsedNewData = newData as Pick<RelatedWordData, 'relatedWordId'>; // Only need relatedWordId for deletion
    const { relatedWordId } = parsedNewData;

    if (relatedWordId === undefined) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing relatedWordId in newData for related word deletion.",
      });
    }

    const result = await tx
      .delete(relatedWords)
      .where(
        and(
          eq(relatedWords.wordId, wordId),
          eq(relatedWords.relatedWordId, relatedWordId)
        )
      );
    
    if (result.count === 0) {
        // It's debatable whether to throw an error if the row is already deleted.
        // For idempotency, one might choose to not throw.
        // However, if an admin explicitly approves a delete, and it's not found, it might indicate an issue.
        console.warn(`Attempted to delete a non-existent related word entry for wordId: ${wordId} and relatedWordId: ${relatedWordId}.`);
        // Not throwing an error here to make the operation idempotent if the record was already deleted.
    }
  }
}
