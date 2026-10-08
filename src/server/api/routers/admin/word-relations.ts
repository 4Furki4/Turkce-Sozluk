import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../trpc";
import { relatedWords } from "@/db/schema/related_words";
import { relatedPhrases } from "@/db/schema/related_phrases";
import { words } from "@/db/schema/words";
import { eq, and, sql } from "drizzle-orm";
import { wordRelationSuggestionProcedures } from "./word-relation-suggestions";

export const wordRelationsAdminRouter = createTRPCRouter({
  ...wordRelationSuggestionProcedures,
  /**
   * Get all related words for a specific word
   */
  getRelatedWords: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      // Using raw SQL query instead of relational query builder
      const result = await db.execute(
        sql`
        SELECT 
          rw.related_word_id as id,
          w.name,
          rw.relation_type as "relationType"
        FROM 
          related_words rw
        JOIN 
          words w ON rw.related_word_id = w.id
        WHERE 
          rw.word_id = ${input.wordId}
        `
      ) as Array<{ id: number; name: string; relationType: string }>;

      return result;
    }),

  /**
   * Search words for adding relations
   */
  searchWords: adminProcedure
    .input(
      z.object({
        query: z.string(),
        excludeWordId: z.number().optional(),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const { query, excludeWordId, limit } = input;

      const result = await db.execute(
        sql`
        SELECT 
          w.id, 
          w.name 
        FROM 
          words w
        WHERE 
          w.name ILIKE ${`%${query}%`}
          ${excludeWordId ? sql`AND w.id != ${excludeWordId}` : sql``}
        ORDER BY 
          CASE 
            WHEN w.name ILIKE ${query} THEN 1
            WHEN w.name ILIKE ${`${query}%`} THEN 2
            ELSE 3
          END,
          LENGTH(w.name)
        LIMIT ${limit}
        `
      ) as Array<{ id: number; name: string }>;

      return result;
    }),

  /**
   * Add a related word
   */
  addRelatedWord: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
        relatedWordId: z.number({
          required_error: "Related word ID is required",
        }),
        relationType: z.string().default("relatedWord"),
      })
    )
    .mutation(async ({ input, ctx: { db, session } }) => {
      const { wordId, relatedWordId, relationType } = input;

      // Check if the relation already exists
      const existingRelation = await db.query.relatedWords.findFirst({
        where: and(
          eq(relatedWords.wordId, wordId),
          eq(relatedWords.relatedWordId, relatedWordId)
        ),
      });

      if (existingRelation) {
        return { success: false, message: "Relation already exists" };
      }

      // Add the relation
      await db.insert(relatedWords).values({
        wordId,
        relatedWordId,
        relationType,
        userId: session.user.id,
      });

      return { success: true };
    }),

  /**
   * Remove a related word
   */
  removeRelatedWord: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
        relatedWordId: z.number({
          required_error: "Related word ID is required",
        }),
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { wordId, relatedWordId } = input;

      await db
        .delete(relatedWords)
        .where(
          and(
            eq(relatedWords.wordId, wordId),
            eq(relatedWords.relatedWordId, relatedWordId)
          )
        );

      return { success: true };
    }),

  /**
   * Update a related word's relation type
   */
  updateRelatedWordType: adminProcedure
    .input(
      z.object({
        wordId: z.number(),
        relatedWordId: z.number(),
        newRelationType: z.string(), // Consider using a Zod enum if relation types are fixed
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { wordId, relatedWordId, newRelationType } = input;

      const result = await db
        .update(relatedWords)
        .set({ relationType: newRelationType, updatedAt: new Date().toISOString().split('T')[0] })
        .where(
          and(
            eq(relatedWords.wordId, wordId),
            eq(relatedWords.relatedWordId, relatedWordId)
          )
        )
        .returning(); 

      if (result.length === 0) {
        return { success: false, message: "Relation not found or not updated." };
      }

      return { success: true, updatedRelation: result[0] };
    }),

  /**
   * Get all related phrases for a specific word
   */
  getRelatedPhrases: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      // Using raw SQL query instead of relational query builder
      const result = await db.execute(
        sql`
        SELECT 
          rp.related_phrase_id as id,
          w.name
        FROM 
          related_phrases rp
        JOIN 
          words w ON rp.related_phrase_id = w.id
        WHERE 
          rp.phrase_id = ${input.wordId}
        `
      ) as Array<{ id: number; name: string }>;

      return result;
    }),

  /**
   * Add a related phrase
   */
  addRelatedPhrase: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
        relatedPhraseId: z.number({
          required_error: "Related phrase ID is required",
        }),
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { wordId, relatedPhraseId } = input;

      // Check if the relation already exists
      const existingRelation = await db.execute(
        sql`
        SELECT 1 
        FROM related_phrases 
        WHERE phrase_id = ${wordId} AND related_phrase_id = ${relatedPhraseId}
        LIMIT 1
        `
      ) as Array<unknown>;

      if (existingRelation.length > 0) {
        return { success: false, message: "Relation already exists" };
      }

      // Add the relation
      await db.insert(relatedPhrases).values({
        wordId,
        relatedPhraseId,
      });

      return { success: true };
    }),

  /**
   * Remove a related phrase
   */
  removeRelatedPhrase: adminProcedure
    .input(
      z.object({
        wordId: z.number({
          required_error: "Word ID is required",
        }),
        relatedPhraseId: z.number({
          required_error: "Related phrase ID is required",
        }),
      })
    )
    .mutation(async ({ input, ctx: { db } }) => {
      const { wordId, relatedPhraseId } = input;

      await db
        .delete(relatedPhrases)
        .where(
          and(
            eq(relatedPhrases.wordId, wordId),
            eq(relatedPhrases.relatedPhraseId, relatedPhraseId)
          )
        );

      return { success: true };
    }),

  /**
   * Get a word by ID with basic info
   */
  getWordById: adminProcedure
    .input(
      z.object({
        id: z.number({
          required_error: "Word ID is required",
        }),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const word = await db.query.words.findFirst({
        where: eq(words.id, input.id),
      });

      return word;
    }),
});
