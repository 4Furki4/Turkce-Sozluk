// src/server/api/handlers/request-handlers/meaning-attribute-handlers.ts
import { RequestHandler, RequestHandlerContext } from "./types";
import { TRPCError } from "@trpc/server";
import { meaningAttributes } from "@/db/schema/meaning_attributes";

export class CreateMeaningAttributeHandler implements RequestHandler<void> {
  async handle({ tx, request }: RequestHandlerContext): Promise<void> {
    const data = request.newData as { attribute?: string };
    const { attribute } = data;

    if (!attribute) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Missing attribute in newData for meaning attribute creation." });
    }

    await tx.insert(meaningAttributes).values({ attribute });
  }
}
