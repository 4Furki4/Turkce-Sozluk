import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";
import { users } from "@/db/schema/users";
import { feedbacks } from "@/db/schema/feedbacks";
import { badges } from "@/db/schema/gamification";
import { wordAttributes } from "@/db/schema/word_attributes";
import { meaningAttributes } from "@/db/schema/meaning_attributes";
import { authors } from "@/db/schema/authors";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { languages } from "@/db/schema/languages";
import { roots } from "@/db/schema/roots";

function required<T>(item: T | undefined): T {
  if (!item) throw new TRPCError({ code: "NOT_FOUND" });
  return item;
}
export const taskRouter = createTRPCRouter({
  user: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx: { db }, input }) =>
      required(
        (
          await db
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(eq(users.id, input.id))
        )[0],
      ),
    ),
  feedback: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx: { db }, input }) =>
      required(
        (
          await db.select().from(feedbacks).where(eq(feedbacks.id, input.id))
        )[0],
      ),
    ),
  badge: adminProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx: { db }, input }) =>
      required(
        (await db.select().from(badges).where(eq(badges.slug, input.slug)))[0],
      ),
    ),
  parameter: adminProcedure
    .input(
      z.object({
        type: z.enum([
          "word-attributes",
          "meaning-attributes",
          "authors",
          "part-of-speech",
          "languages",
          "roots",
        ]),
        id: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx: { db }, input }) => {
      switch (input.type) {
        case "word-attributes":
          return required(
            (
              await db
                .select()
                .from(wordAttributes)
                .where(eq(wordAttributes.id, input.id))
            )[0],
          );
        case "meaning-attributes":
          return required(
            (
              await db
                .select()
                .from(meaningAttributes)
                .where(eq(meaningAttributes.id, input.id))
            )[0],
          );
        case "authors":
          return required(
            (
              await db.select().from(authors).where(eq(authors.id, input.id))
            )[0],
          );
        case "part-of-speech":
          return required(
            (
              await db
                .select()
                .from(partOfSpeechs)
                .where(eq(partOfSpeechs.id, input.id))
            )[0],
          );
        case "languages":
          return required(
            (
              await db
                .select()
                .from(languages)
                .where(eq(languages.id, input.id))
            )[0],
          );
        case "roots":
          return required(
            (await db.select().from(roots).where(eq(roots.id, input.id)))[0],
          );
      }
    }),
});
