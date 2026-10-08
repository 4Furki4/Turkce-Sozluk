import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
} from "../trpc";
import { count, desc, eq, gte, sql, inArray, max } from "drizzle-orm";
import { words } from "@/db/schema/words";
import { pronunciations } from "@/db/schema/pronunciations";
import { pronunciationVotes } from "@/db/schema/pronunciation_votes";
import { users } from "@/db/schema/users";
import type { WordSearchResult, DashboardWordList } from "@/types";
import DOMPurify from "isomorphic-dompurify";
import { purifyObject } from "@/src/lib/utils";
import { searchLogs } from "@/db/schema/search_logs";
import { generateAccentVariations } from "@/src/lib/search-utils";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { languages } from "@/db/schema/languages";
import { wordAttributes } from "@/db/schema/word_attributes";
import { readPublicDictionary } from "@/src/server/dictionary-cache";
import { readWord } from "@/src/server/word-cache";
import { scheduleSearchLog } from "@/src/server/search-logging";

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
        sortBy: z.enum(['alphabetical', 'date', 'length']).optional().default('alphabetical'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
        startsWith: z.string().optional(),
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

      if (purifiedInput.startsWith) {
        conditions.push(sql`w.name ILIKE ${`${purifiedInput.startsWith}%`}`);
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

      const sortOrder = purifiedInput.sortOrder === "desc" ? sql`DESC` : sql`ASC`;
      const searchTerm = purifiedInput.search?.trim() ?? "";
      const relevance = Boolean(searchTerm) && purifiedInput.sortBy === "alphabetical" && purifiedInput.sortOrder === "asc";
      const order = (alias: "w" | "page") => {
        const name = sql.raw(`${alias}.name`);
        const id = sql.raw(alias === "w" ? "w.id" : "page.word_id");
        if (relevance) {
          return sql`match_rank, name_length, ${name}, ${id}`;
        }
        if (purifiedInput.sortBy === "date") {
          return sql`${sql.raw(`${alias}.created_at`)} ${sortOrder}, ${name} ASC, ${id}`;
        }
        if (purifiedInput.sortBy === "length") {
          return sql`name_length ${sortOrder}, ${name} ASC, ${id}`;
        }
        return sql`${name} ${sortOrder}, ${id}`;
      };

      // Bound child reads to the requested page. Lowest-ID child selection is unchanged.
      const query = sql`
        WITH page AS MATERIALIZED (
          SELECT w.id AS word_id, w.name,
            ${purifiedInput.sortBy === "date" ? sql`w.created_at` : sql`NULL::date`} AS created_at,
            LENGTH(w.name) AS name_length,
            CASE WHEN w.name ILIKE ${searchTerm} THEN 1
                 WHEN w.name ILIKE ${`${searchTerm}%`} THEN 2 ELSE 3 END AS match_rank
          FROM words w
          WHERE ${whereSql}
          ORDER BY ${order("w")}
          LIMIT ${purifiedInput.take} OFFSET ${purifiedInput.skip}
        )
        SELECT page.word_id, page.name, m.meaning,
          w_rel.name AS related_word_name, rw_rel.relation_type
        FROM page
        LEFT JOIN LATERAL (
          SELECT meaning FROM meanings
          WHERE word_id = page.word_id ORDER BY id LIMIT 1
        ) m ON TRUE
        LEFT JOIN LATERAL (
          SELECT related_word_id, relation_type FROM related_words
          WHERE word_id = page.word_id ORDER BY related_word_id LIMIT 1
        ) rw_rel ON TRUE
        LEFT JOIN words w_rel ON w_rel.id = rw_rel.related_word_id
        ORDER BY ${order("page")};
      `;

      const wordsWithMeanings = await db.execute(query) as DashboardWordList[];
      return wordsWithMeanings;
    }),

  getFilterOptions: publicProcedure.query(async ({ ctx: { db } }) => {
    return readPublicDictionary(db, "filter-options", async () => {
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

    });
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

      const result = await readWord(db, purifiedName);
      const wordId = result[0]?.word_data?.word_id;
      if (!input.skipLogging && wordId) {
        scheduleSearchLog({ wordId, userId: session?.user?.id ?? null });
      }
      return result;
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
        limit: z.number().int().min(1).max(50).optional().default(10),
        period: z.enum(['allTime', 'last7Days', 'last30Days']).optional().default('allTime'),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      try {
        const cutoff =
          input.period === "last7Days"
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            : input.period === "last30Days"
              ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              : null;

        const searchCount = count(searchLogs.wordId).mapWith(Number);

        const popularWords = await db
          .select({
            id: words.id,
            name: words.name,
            search_count: searchCount,
          })
          .from(searchLogs)
          .innerJoin(words, eq(searchLogs.wordId, words.id))
          .where(cutoff ? gte(searchLogs.searchTimestamp, cutoff) : undefined)
          .groupBy(words.id, words.name)
          .orderBy(desc(searchCount))
          .limit(input.limit);

        if (popularWords.length > 0) {
          return popularWords;
        }

        return db
          .select({
            id: words.id,
            name: words.name,
            search_count: sql<number>`COALESCE(${words.viewCount}, 0)`.mapWith(Number),
          })
          .from(words)
          .where(sql`COALESCE(${words.viewCount}, 0) > 0`)
          .orderBy(desc(sql<number>`COALESCE(${words.viewCount}, 0)`))
          .limit(input.limit);
      } catch (error) {
        console.error("Error fetching popular words:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while fetching popular words.",
          cause: error,
        });
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
        startsWith: z.string().optional(),
      })
    )
    .query(async ({ input, ctx: { db } }) => {
      const purifiedInput = purifyObject(input)

      const conditions = [];

      if (purifiedInput.search) {
        conditions.push(sql`name ILIKE ${`%${purifiedInput.search}%`}`);
      }

      if (purifiedInput.startsWith) {
        conditions.push(sql`name ILIKE ${`${purifiedInput.startsWith}%`}`);
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
    return readPublicDictionary(ctx.db, "autocomplete-version", async () => {
    const result = await ctx.db
      .select({
        latest: max(words.updated_at),
      })
      .from(words);
    return result[0]?.latest ?? "0";

    });
  }),

  /**
   * Returns all word names for the autocomplete list.
   */
  getAllWordNames: publicProcedure.query(async ({ ctx }) => {
    return readPublicDictionary(ctx.db, "all-word-names", async () => {
    const results = await ctx.db.query.words.findMany({
      columns: { name: true },
    });
    return results.map((word) => word.name);

    });
  }),

  getWordOfTheDay: publicProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split('T')[0];

    // Fetch the latest daily word up to today
    // @ts-ignore
    const result = await ctx.db.execute(sql`
      SELECT dw.date, w.id, w.name, w.phonetic, w.created_at, w.updated_at, w.root_id, w.prefix, w.suffix, w.view_count, w.variant, w.request_type, l.language_tr as origin
      FROM daily_words dw
      JOIN words w ON dw.word_id = w.id
      LEFT JOIN roots r ON w.id = r.word_id
      LEFT JOIN languages l ON r.language_id = l.id
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
        origin: dailyWordData.origin as string | null,
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
