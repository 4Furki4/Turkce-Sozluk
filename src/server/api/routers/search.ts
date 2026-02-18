import { createTRPCRouter, publicProcedure } from "@/src/server/api/trpc";
import { z } from "zod";
import { words } from "@/db/schema/words";
import { ilike } from "drizzle-orm";
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
      if (input.query.length < 2) {
        return [];
      }
      const results = await ctx.db.query.words.findMany({
        where: ilike(words.name, `%${input.query}%`),
        limit: 10,
        columns: {
          id: true,
          name: true,
        },
      });
      return results;
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
