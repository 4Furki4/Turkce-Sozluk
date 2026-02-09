import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../../trpc";
import { db } from "@/db";
import { eq, like, sql } from "drizzle-orm";
import { wordAttributes } from "@/db/schema/word_attributes";
import { meaningAttributes } from "@/db/schema/meaning_attributes";
import { authors } from "@/db/schema/authors";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { languages } from "@/db/schema/languages";
import { roots } from "@/db/schema/roots";

const paginationSchema = z.object({
  take: z.number(),
  skip: z.number(),
  search: z.string(),
});

export const dynamicParametersRouter = createTRPCRouter({
  // Word Attributes
  getWordAttributes: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(wordAttributes)
        .where(like(wordAttributes.attribute, `%${search}%`))
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(wordAttributes)
        .where(like(wordAttributes.attribute, `%${search}%`));

      return {
        items,
        total: count,
      };
    }),

  createWordAttribute: adminProcedure
    .input(z.object({ attribute: z.string() }))
    .mutation(async ({ input }) => {
      return await db.insert(wordAttributes).values(input);
    }),

  updateWordAttribute: adminProcedure
    .input(z.object({ id: z.number(), attribute: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db
        .update(wordAttributes)
        .set(data)
        .where(eq(wordAttributes.id, id));
    }),

  deleteWordAttribute: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db
        .delete(wordAttributes)
        .where(eq(wordAttributes.id, input.id));
    }),

  // Meaning Attributes
  getMeaningAttributes: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(meaningAttributes)
        .where(like(meaningAttributes.attribute, `%${search}%`))
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(meaningAttributes)
        .where(like(meaningAttributes.attribute, `%${search}%`));

      return {
        items,
        total: count,
      };
    }),

  createMeaningAttribute: adminProcedure
    .input(z.object({ attribute: z.string() }))
    .mutation(async ({ input }) => {
      return await db.insert(meaningAttributes).values(input);
    }),

  updateMeaningAttribute: adminProcedure
    .input(z.object({ id: z.number(), attribute: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db
        .update(meaningAttributes)
        .set(data)
        .where(eq(meaningAttributes.id, id));
    }),

  deleteMeaningAttribute: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db
        .delete(meaningAttributes)
        .where(eq(meaningAttributes.id, input.id));
    }),

  // Authors
  getAuthors: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(authors)
        .where(like(authors.name, `%${search}%`))
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(authors)
        .where(like(authors.name, `%${search}%`));

      return {
        items,
        total: count,
      };
    }),

  createAuthor: adminProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      return await db.insert(authors).values(input);
    }),

  updateAuthor: adminProcedure
    .input(z.object({ id: z.number(), name: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.update(authors).set(data).where(eq(authors.id, id));
    }),

  deleteAuthor: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.delete(authors).where(eq(authors.id, input.id));
    }),

  // Part of Speech
  getPartOfSpeeches: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(partOfSpeechs)
        .where(like(partOfSpeechs.partOfSpeech, `%${search}%`))
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(partOfSpeechs)
        .where(like(partOfSpeechs.partOfSpeech, `%${search}%`));

      return {
        items,
        total: count,
      };
    }),

  createPartOfSpeech: adminProcedure
    .input(z.object({ partOfSpeech: z.string() }))
    .mutation(async ({ input }) => {
      return await db.insert(partOfSpeechs).values(input);
    }),

  updatePartOfSpeech: adminProcedure
    .input(z.object({ id: z.number(), partOfSpeech: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db
        .update(partOfSpeechs)
        .set(data)
        .where(eq(partOfSpeechs.id, id));
    }),

  deletePartOfSpeech: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db
        .delete(partOfSpeechs)
        .where(eq(partOfSpeechs.id, input.id));
    }),

  // Languages
  getLanguages: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(languages)
        .where(
          like(
            sql`CONCAT(${languages.language_code}, ' ', ${languages.language_en}, ' ', ${languages.language_tr})`,
            `%${search}%`
          )
        )
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(languages)
        .where(
          like(
            sql`CONCAT(${languages.language_code}, ' ', ${languages.language_en}, ' ', ${languages.language_tr})`,
            `%${search}%`
          )
        );

      return {
        items,
        total: count,
      };
    }),

  createLanguage: adminProcedure
    .input(
      z.object({
        language_code: z.string(),
        language_en: z.string(),
        language_tr: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.insert(languages).values(input);
    }),

  updateLanguage: adminProcedure
    .input(
      z.object({
        id: z.number(),
        language_code: z.string(),
        language_en: z.string(),
        language_tr: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.update(languages).set(data).where(eq(languages.id, id));
    }),

  deleteLanguage: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.delete(languages).where(eq(languages.id, input.id));
    }),

  // Roots
  getRoots: adminProcedure
    .input(paginationSchema)
    .query(async ({ input }) => {
      const { take, skip, search } = input;

      const items = await db
        .select()
        .from(roots)
        .where(like(roots.root, `%${search}%`))
        .limit(take)
        .offset(skip);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(roots)
        .where(like(roots.root, `%${search}%`));

      return {
        items,
        total: count,
      };
    }),

  createRoot: adminProcedure
    .input(
      z.object({
        root: z.string(),
        language_id: z.number(),
        word_id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.insert(roots).values({
        root: input.root,
        languageId: input.language_id,
        wordId: input.word_id,
      });
    }),

  updateRoot: adminProcedure
    .input(
      z.object({
        id: z.number(),
        root: z.string(),
        language_id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.update(roots).set(data).where(eq(roots.id, id));
    }),

  deleteRoot: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.delete(roots).where(eq(roots.id, input.id));
    }),
});
