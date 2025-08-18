// src/server/api/handlers/request-handlers/author-handlers.ts
import { RequestHandler, RequestHandlerContext } from "./types";
import { TRPCError } from "@trpc/server";
import { authors } from "@/db/schema/authors";

export class CreateAuthorHandler implements RequestHandler<void> {
  async handle({ tx, request }: RequestHandlerContext): Promise<void> {
    const data = request.newData as { name?: string };
    const { name } = data;

    if (!name) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Missing name in newData for author creation." });
    }

    await tx.insert(authors).values({ name });
  }
}
