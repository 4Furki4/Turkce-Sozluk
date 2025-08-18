// src/server/api/handlers/request-handlers/pronunciation-handler.ts
import { RequestHandler, RequestHandlerContext } from "./types";
import { TRPCError } from "@trpc/server";
import { pronunciations } from "@/db/schema/pronunciations";

interface PronunciationCreateData {
  audio_url?: string;
}

export class CreatePronunciationHandler implements RequestHandler<void> {
  async handle({ tx, request }: RequestHandlerContext): Promise<void> {
    const wordId = request.entityId;
    if (wordId === null || wordId === undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Word ID (entityId) is required for pronunciation creation." });
    }

    const { audio_url } = (request.newData as PronunciationCreateData) || {};
    if (!audio_url) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Missing audio_url in newData for pronunciation creation." });
    }

    await tx.insert(pronunciations).values({
      wordId,
      userId: request.userId,
      audioUrl: audio_url,
    });
  }
}
