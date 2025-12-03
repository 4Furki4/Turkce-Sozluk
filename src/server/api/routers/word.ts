import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
} from "../trpc";
import { eq, sql, inArray, max } from "drizzle-orm";
import { words } from "@/db/schema/words";
import { pronunciations } from "@/db/schema/pronunciations";
import { pronunciationVotes } from "@/db/schema/pronunciation_votes";
import { users } from "@/db/schema/users";
import type { WordSearchResult, DashboardWordList } from "@/types";
import DOMPurify from "isomorphic-dompurify";
import { purifyObject } from "@/src/lib/utils";
import { searchLogs, type NewSearchLog } from "@/db/schema/search_logs";
import { userSearchHistory, type InsertUserSearchHistory } from "@/db/schema/user_search_history";
import { generateAccentVariations } from "@/src/lib/search-utils";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { languages } from "@/db/schema/languages";
import { wordAttributes } from "@/db/schema/word_attributes";

export const wordRouter = createTRPCRouter({
  searchWordsSimple: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      if (input.query.trim() === "") {
        return { words: [] };
      }
      const variations = generateAccentVariations(input.query);
      const whereClauses = variations.map((term) =>
        sql`${words.name} ILIKE ${`%${term}%`}`
      );
      const whereSql = sql.join(whereClauses, sql` OR `);

      const searchResults = await db
        .select({
          id: words.id,
          word: words.name, // Ensure 'name' is aliased to 'word' for consistency if needed, or use 'name'
        })
        .from(words)
        .where(whereSql)
        .limit(input.limit)
        .orderBy(words.name);
      return { words: searchResults };
    }),
  /**
   * Get all words from database with pagination
   */
  getWords: publicProcedure
    .input(
      z.object({
        take: z.number().optional().default(5),
        skip: z.number().optional().default(0),
        search: z.string().optional(),
        partOfSpeechId: z.array(z.string()).optional(),
        languageId: z.array(z.string()).optional(),
        attributeId: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const purifiedInput = purifyObject(input);

      // Base filters
      const conditions = [];
      const joins = [];

      if (purifiedInput.search && purifiedInput.search.trim() !== "") {
        conditions.push(sql`w.name ILIKE ${`%${purifiedInput.search.trim()}%`}`);
      }

      if (purifiedInput.partOfSpeechId?.length) {
        const ids = purifiedInput.partOfSpeechId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM meanings m_filter 
          WHERE m_filter.word_id = w.id 
          AND m_filter.part_of_speech_id IN ${ids}
        )`);
      }

      if (purifiedInput.languageId?.length) {
        const ids = purifiedInput.languageId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM roots r_filter 
          WHERE r_filter.word_id = w.id 
          AND r_filter.language_id IN ${ids}
        )`);
      }

      if (purifiedInput.attributeId?.length) {
        const ids = purifiedInput.attributeId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM words_attributes wa_filter 
          WHERE wa_filter.word_id = w.id 
          AND wa_filter.attribute_id IN ${ids}
        )`);
      }

      const whereSql = conditions.length > 0
        ? sql.join(conditions, sql` AND `)
        : sql`TRUE`;

      let query;

      if (purifiedInput.search && purifiedInput.search.trim() !== "") {
        const searchTerm = purifiedInput.search.trim();
        query = sql`
        WITH RankedWords AS (
          SELECT
            w.id AS word_id,
            w.name AS name,
            CASE
              WHEN w.name ILIKE ${searchTerm} THEN 1
              WHEN w.name ILIKE ${`${searchTerm}%`} THEN 2
              ELSE 3
            END AS match_rank,
            LENGTH(w.name) AS name_length
          FROM words w
          WHERE ${whereSql}
        )
        SELECT
            rw.word_id,
            rw.name,
            m.meaning
        FROM
            RankedWords rw
            LEFT JOIN (
                SELECT DISTINCT ON (word_id)
                    id,
                    word_id,
                    meaning
                FROM
                    meanings
                ORDER BY
                    word_id,
                    id
            ) m ON rw.word_id = m.word_id
        ORDER BY
            rw.match_rank,
            rw.name_length,
            rw.name
        LIMIT ${purifiedInput.take} OFFSET ${purifiedInput.skip};
      `;
      } else {
        query = sql`
        SELECT
            w.id AS word_id,
            w.name AS name,
            m.meaning
        FROM
            words w
            LEFT JOIN (
                SELECT DISTINCT ON (word_id)
                    id,
                    word_id,
                    meaning
                FROM
                    meanings
                ORDER BY
                    word_id,
                    id
            ) m ON w.id = m.word_id
        WHERE ${whereSql}
        ORDER BY
            w.name
        LIMIT ${purifiedInput.take} OFFSET ${purifiedInput.skip};
      `;
      }

      const wordsWithMeanings = await db.execute(query) as DashboardWordList[];
      return wordsWithMeanings;
    }),

  getFilterOptions: publicProcedure.query(async ({ ctx: { db } }) => {
    const [pos, langs, attrs] = await Promise.all([
      db.select().from(partOfSpeechs),
      db.select().from(languages),
      db.select().from(wordAttributes),
    ]);

    return {
      partOfSpeechs: pos,
      languages: langs,
      attributes: attrs,
    };
  }),
  /**
   * Get a word by name quering the database
   */
  getWord: publicProcedure
    .input(
      z.object({
        name: z.string({
          invalid_type_error: "Word must be a string",
          required_error: "Word is required to get a word",
        }),
        skipLogging: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input, ctx: { db, session } }) => {
      const purifiedName = DOMPurify.sanitize(input.name);

      const result = await db.execute(sql`
        WITH base_word AS (
          SELECT w.id, w.name, w.phonetic, w.prefix, w.suffix
          FROM words w
          WHERE w.name ILIKE ${purifiedName} -- 1. Find all possible matches (case-insensitive)
          ORDER BY
            CASE
              WHEN w.name = ${purifiedName} THEN 1 -- 2. Prioritize exact case-sensitive match
              ELSE 2 -- 3. Fallback to case-insensitive match
            END
          LIMIT 1 -- 4. Select only the single best match
        )
        SELECT json_build_object(
              'word_id', w.id,
              'word_name', w.name,
              'phonetic', w.phonetic,
              'prefix', w.prefix,
              'suffix', w.suffix,
              'attributes', COALESCE(
                (SELECT json_agg(json_build_object(
                  'attribute_id', wa.id, 
                  'attribute', wa.attribute
                ))
                FROM words_attributes wattr
                JOIN word_attributes wa ON wattr.attribute_id = wa.id
                WHERE wattr.word_id = w.id), '[]'::json
              ),
              'root', COALESCE(
                (SELECT json_build_object(
                  'root', r.root,
                  'language_en', l.language_en,
                  'language_tr', l.language_tr,
                  'language_code', l.language_code
                )
                FROM roots r
                JOIN languages l ON r.language_id = l.id
                WHERE r.word_id = w.id
                LIMIT 1), 
                json_build_object(
                  'root', null,
                  'language_en', null,
                  'language_tr', null,
                  'language_code', null
                )
              ),
              'meanings', COALESCE(
                (SELECT json_agg(json_build_object(
                  'meaning_id', m.id,
                  'meaning', m.meaning,
                  'imageUrl', m."imageUrl",
                  'part_of_speech', p.part_of_speech,
                  'part_of_speech_id', p.id,
                  'attributes', COALESCE(
                    (SELECT json_agg(json_build_object(
                      'attribute_id', ma.id, 
                      'attribute', ma.attribute
                    ))
                    FROM meanings_attributes mattr
                    JOIN meaning_attributes ma ON mattr.attribute_id = ma.id
                    WHERE mattr.meaning_id = m.id), '[]'::json
                  ),
                  'sentence', e.sentence,
                  'author', a.name,
                  'author_id', a.id
                ) ORDER BY m."order" ASC)
                FROM meanings m
                LEFT JOIN part_of_speechs p ON m.part_of_speech_id = p.id
                LEFT JOIN examples e ON e.meaning_id = m.id
                LEFT JOIN authors a ON e.author_id = a.id
                WHERE m.word_id = w.id), '[]'::json
              ),
              'relatedWords', COALESCE(
                (SELECT json_agg(json_build_object(
                  'related_word_id', rw.id,
                  'related_word_name', rw.name,
                  'relation_type', rel.relation_type
                ))
                FROM related_words rel
                JOIN words rw ON rel.related_word_id = rw.id
                WHERE rel.word_id = w.id), '[]'::json
              ),
              'relatedPhrases', COALESCE(
                (SELECT json_agg(json_build_object(
                  'related_phrase_id', rp.id,
                  'related_phrase', rp.name
                ))
                FROM related_phrases rel
                JOIN words rp ON rel.related_phrase_id = rp.id
                WHERE rel.phrase_id = w.id), '[]'::json
              ),
              'pronunciations', COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', p.id,
                  'audioUrl', p."audio_url",
                  'user', json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'image', u.image
                  ),
                  'voteCount', 0
                ))
                FROM pronunciations p
                JOIN users u ON p."user_id" = u.id
                WHERE p.word_id = w.id), '[]'::json
              )
          ) AS word_data
        FROM base_word w 
      `);

      // Filter any null or undefined results
      const filteredResult = result.filter(Boolean) as any[];

      if (filteredResult.length > 0 && filteredResult[0]?.word_data) {
        const wordData = filteredResult[0].word_data as WordSearchResult['word_data']; // Type assertion for safety

        // --- Conditionally Log search --- 
        if (!input.skipLogging && wordData?.word_id) {
          const userId = session?.user?.id ?? null; // Get user ID if logged in, else null

          const newLog: NewSearchLog = {
            wordId: wordData.word_id,
            userId
            // searchTimestamp is handled by DB default
          };

          try {
            // Insert into general search logs (existing functionality)
            await db.insert(searchLogs).values(newLog);
            console.log(`Logged search for wordId: ${wordData.word_id}, userId: ${userId}`);

            // Additionally log to user_search_history if user is logged in
            if (userId) {
              const userHistoryLog: InsertUserSearchHistory = {
                userId,
                wordId: wordData.word_id,
                // searchedAt is handled by DB default
              };

              // Use fire-and-forget pattern (don't await) to avoid slowing down the response
              db.insert(userSearchHistory).values(userHistoryLog)
                .then(() => console.log(`Logged user search history for userId: ${userId}, wordId: ${wordData.word_id}`))
                .catch(err => console.error("Failed to insert user search history:", err));
            }
          } catch (error) {
            console.error("Failed to insert search log:", error);
          }
        }

        // Fix the double-nesting issue - Assuming WordSearchResult expects { word_data: ... }
        const formattedResult = filteredResult.map(item => {
          // Original code might have had issues if item structure varied
          // Ensure consistent structure before returning
          if (item.word_data) {
            return { word_data: item.word_data };
          } else if (item) { // Handle cases where word_data might be missing but item exists
            console.warn("Unexpected item structure in getWord result:", item);
            // Return a default/empty structure or handle as needed
            // For now, let's assume item itself is the word_data if word_data key is absent
            return { word_data: item };
          } else {
            return null; // Or handle null/undefined items appropriately
          }
        });
        // console.log('Formatted database response:', JSON.stringify(formattedResult, null, 2));
        return formattedResult.filter(Boolean) as WordSearchResult[]; // Ensure no nulls are returned
      } else {
        return [];
      }
    }),

  /**
   * Get a word's name by its ID.
   */
  getWordById: publicProcedure
    .input(
      z.object({
        id: z.coerce.number(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      try {
        const word = await db.query.words.findFirst({
          where: eq(words.id, input.id),
          columns: {
            id: true,
            name: true,
            prefix: true,
            suffix: true,
          },
        });

        return word || null;
      } catch (error) {
        console.error(`Error in getWordById for id: ${input.id}`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while fetching the word.',
          cause: error,
        });
      }
    }),

  /**
   * Get pronunciations for a specific word with voting information
   */
  getPronunciationsForWord: publicProcedure
    .input(
      z.object({
        wordId: z.number(),
      })
    )
    .query(async ({ input, ctx: { db, session } }) => {
      try {
        const pronunciationsWithVotes = await db
          .select({
            id: pronunciations.id,
            audioUrl: pronunciations.audioUrl,
            user: {
              id: users.id,
              name: users.name,
              image: users.image,
            },
            voteCount: sql<number>`COALESCE(SUM(${pronunciationVotes.voteType}), 0)`.as("voteCount"),
            hasVoted: session?.user
              ? sql<boolean>`EXISTS(SELECT 1 FROM ${pronunciationVotes} WHERE ${pronunciationVotes.pronunciationId} = ${pronunciations.id} AND ${pronunciationVotes.userId} = ${session.user.id})`.as("hasVoted")
              : sql<boolean>`false`.as("hasVoted"),
            userVote: session?.user
              ? sql<number>`(SELECT vote_type FROM ${pronunciationVotes} WHERE ${pronunciationVotes.pronunciationId} = ${pronunciations.id} AND ${pronunciationVotes.userId} = ${session.user.id})`.as("userVote")
              : sql<number>`0`.as("userVote"),
          })
          .from(pronunciations)
          .leftJoin(users, eq(pronunciations.userId, users.id))
          .leftJoin(pronunciationVotes, eq(pronunciations.id, pronunciationVotes.pronunciationId))
          .where(eq(pronunciations.wordId, input.wordId))
          .groupBy(pronunciations.id, users.id)
          .orderBy(sql`COALESCE(SUM(${pronunciationVotes.voteType}), 0) DESC`);

        return pronunciationsWithVotes;
      } catch (error) {
        console.error(`Error in getPronunciationsForWord for wordId: ${input.wordId}`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while fetching pronunciations.',
          cause: error,
        });
      }
    }),

  /**
   * Get popular words based on search logs
   */
  getPopularWords: publicProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
        period: z.enum(['allTime', 'last7Days', 'last30Days']).optional().default('allTime'),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      let periodFilter = sql`TRUE`; // Default for 'allTime', effectively no date filter

      if (input.period === 'last7Days') {
        periodFilter = sql`sl.search_timestamp >= NOW() - INTERVAL '7 days'`;
      } else if (input.period === 'last30Days') {
        periodFilter = sql`sl.search_timestamp >= NOW() - INTERVAL '30 days'`;
      }

      const query = sql`
        SELECT
            w.id AS id,
            w.name AS name,
            COUNT(sl.word_id)::integer AS search_count
        FROM
            search_logs sl
        JOIN
            words w ON sl.word_id = w.id
        WHERE
            ${periodFilter}
        GROUP BY
            w.id, w.name
        ORDER BY
            search_count DESC
        LIMIT ${input.limit};
      `;

      try {
        const popularWords = await db.execute(query) as Array<{ id: number; name: string; search_count: number }>;
        return popularWords;
      } catch (error) {
        console.error("Error fetching popular words:", error);
        // Optionally, throw a TRPCError or return a specific error structure
        // For now, returning empty array on error to prevent breaking frontend
        return [];
      }
    }),

  getRecommendations: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(5),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const purifiedInput = purifyObject(input);
      if (!purifiedInput.query) {
        return [];
      }

      const searchVariations = generateAccentVariations(purifiedInput.query);

      // Dynamically construct the parts of the raw SQL query using Drizzle's `sql` tag
      const whereClauses = searchVariations.map(term => sql`w.name ILIKE ${`%${term}%`}`);
      const whereSql = sql.join(whereClauses, sql` OR `);

      const caseClauses = searchVariations.flatMap(term => [
        sql`WHEN w.name ILIKE ${term} THEN 1`,
        sql`WHEN w.name ILIKE ${`${term}%`} THEN 2`
      ]);
      const caseSql = sql.join(caseClauses, sql` `);

      // The entire query is now a single `SQL` object
      const finalQuery = sql`
        WITH RankedWords AS (
          SELECT
            w.id AS word_id,
            w.name AS name,
            CASE ${caseSql} ELSE 3 END AS match_rank,
            LENGTH(w.name) AS name_length
          FROM words w
          WHERE ${whereSql}
        )
        SELECT DISTINCT
          word_id,
          name,
          match_rank,
          name_length
        FROM RankedWords
        ORDER BY
          match_rank,
          name_length
        LIMIT ${purifiedInput.limit};
      `;

      // db.execute now receives a single, valid argument
      const result = await db.execute(finalQuery) as { word_id: number; name: string; match_rank: number; name_length: number }[]

      // The result from vercel/postgres driver is an object with a 'rows' property
      const recommendations = result ?? [];

      return recommendations.map(({ word_id, name }) => ({ word_id, name }));
    }),
  getWordCount: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        partOfSpeechId: z.array(z.string()).optional(),
        languageId: z.array(z.string()).optional(),
        attributeId: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const purifiedInput = purifyObject(input)

      const conditions = [];

      if (purifiedInput.search) {
        conditions.push(sql`name ILIKE ${`%${purifiedInput.search}%`}`);
      }

      if (purifiedInput.partOfSpeechId?.length) {
        const ids = purifiedInput.partOfSpeechId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM meanings m_filter 
          WHERE m_filter.word_id = words.id 
          AND m_filter.part_of_speech_id IN ${ids}
        )`);
      }

      if (purifiedInput.languageId?.length) {
        const ids = purifiedInput.languageId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM roots r_filter 
          WHERE r_filter.word_id = words.id 
          AND r_filter.language_id IN ${ids}
        )`);
      }

      if (purifiedInput.attributeId?.length) {
        const ids = purifiedInput.attributeId.map((id: string) => parseInt(id));
        conditions.push(sql`EXISTS (
          SELECT 1 FROM words_attributes wa_filter 
          WHERE wa_filter.word_id = words.id 
          AND wa_filter.attribute_id IN ${ids}
        )`);
      }

      const whereSql = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const result = await db.execute(
        sql`
        SELECT COUNT(*) as count
        FROM words
        ${whereSql}
        `
      ) as { count: number }[];
      return Number(result[0].count);
    }),

  getWordsByIds: publicProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      console.log('Input IDs:', input.ids);
      if (input.ids.length === 0) {
        return [];
      }
      try {
        const result = await db.select({
          id: words.id,
          name: words.name,
        })
          .from(words)
          .where(inArray(words.id, input.ids));

        return result;
      } catch (error) {
        console.error("Error fetching words by IDs:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch words by IDs.',
          cause: error,
        });
      }
    }),
  /**
 * Returns a version string for the word list.
 * We use the most recent 'updated_at' timestamp as the version.
 */
  getAutocompleteListVersion: publicProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        latest: max(words.updated_at),
      })
      .from(words);
    return result[0]?.latest ?? "0";
  }),

  /**
   * Returns all word names for the autocomplete list.
   */
  getAllWordNames: publicProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.words.findMany({
      columns: { name: true },
    });
    return results.map((word) => word.name);
  }),
  getWordOfTheDay: publicProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    // Fetch the latest daily word up to today
    // @ts-ignore
    const result = await ctx.db.execute(sql`
      SELECT dw.date, w.id, w.name, w.phonetic, w.created_at, w.updated_at, w.root_id, w.prefix, w.suffix, w.view_count, w.variant, w.request_type
      FROM daily_words dw
      JOIN words w ON dw.word_id = w.id
      WHERE dw.date <= ${today}
      ORDER BY dw.date DESC
      LIMIT 1
    `);

    const dailyWordData = result[0];

    if (!dailyWordData) return null;

    // 3. Fetch meanings (limit 1)
    // @ts-ignore
    const meaningsResult = await ctx.db.execute(sql`
      SELECT meaning
      FROM meanings
      WHERE word_id = ${dailyWordData.id}
      LIMIT 1
    `);

    // 4. Fetch related words
    // @ts-ignore
    const relatedWordsResult = await ctx.db.execute(sql`
      SELECT w.id, w.name, rw.relation_type
      FROM related_words rw
      JOIN words w ON rw.related_word_id = w.id
      WHERE rw.word_id = ${dailyWordData.id}
    `);

    // Construct the response object
    return {
      date: dailyWordData.date as string,
      word: {
        id: dailyWordData.id as number,
        name: dailyWordData.name as string,
        phonetic: dailyWordData.phonetic as string | null,
        meanings: meaningsResult as unknown as { meaning: string }[],
        relatedWordsList: relatedWordsResult.map((r: any) => ({
          relatedWord: {
            id: r.id as number,
            name: r.name as string,
            relationType: r.relation_type as string
          }
        }))
      }
    };
  }),
});
