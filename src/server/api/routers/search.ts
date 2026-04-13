import { createTRPCRouter, publicProcedure } from "@/src/server/api/trpc";
import {
  normalizeDictionaryQuery,
  sortDictionarySuggestions,
} from "@/src/lib/search-suggestions";
import { z } from "zod";
import { words } from "@/db/schema/words";
import { ilike, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { Meilisearch } from "meilisearch";
// Initialize Meilisearch client
// In a production environment, these should be in your .env file
const meiliClient = new Meilisearch({
  host: process.env.MEILI_HOST ?? "http://192.168.1.2:7700",
  apiKey: process.env.MEILI_MASTER_KEY,
});
export const searchRouter = createTRPCRouter({
  getWordId: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input }) => {
      const word = await ctx.db.query.words.findFirst({
        where: ilike(words.name, input.name),
        columns: {
          id: true,
        },
      });

      if (!word) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Word "${input.name}" not found.`,
        });
      }

      return { wordId: word.id };
    }),
  getWords: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      const normalizedQuery = normalizeDictionaryQuery(input.query);

      if (normalizedQuery.length < 2) {
        return [];
      }

      const exactPattern = normalizedQuery;
      const prefixPattern = `${normalizedQuery}%`;
      const containsPattern = `%${normalizedQuery}%`;

      const results = await ctx.db
        .select({
          id: words.id,
          name: words.name,
        })
        .from(words)
        .where(ilike(words.name, containsPattern))
        .orderBy(
          sql<number>`
            case
              when ${words.name} ilike ${exactPattern} then 0
              when ${words.name} ilike ${prefixPattern} then 1
              else 2
            end
          `,
          sql`lower(${words.name})`,
        )
        .limit(25);

      return sortDictionarySuggestions(results, normalizedQuery).slice(0, 10);
    }),
  searchByMeaning: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      if (input.query.length < 3) {
        return [];
      }

      try {
        const index = meiliClient.index("meanings");

        const searchResults = await index.search(input.query, {
          limit: 20,
          attributesToRetrieve: ["wordName", "meaning", "wordId"],
          // Highlights the matching part of the meaning for better UX
          attributesToHighlight: ["meaning"],
        });

        return searchResults.hits.map((hit) => ({
          id: hit.wordId,
          name: hit.wordName,
          meaning: hit.meaning,
          formattedMeaning: hit._formatted?.meaning,
        }));
      } catch (error) {
        console.error("Meilisearch error:", error);
        // Fallback to empty array so the UI doesn't crash if the Pi is offline
        return [];
      }
    }),
});
