import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { words } from "@/db/schema/words";
import { pronunciations } from "@/db/schema/pronunciations";
import { pronunciationAssets, wordPronunciationAudio } from "@/db/schema/pronunciation_assets";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const pronunciationRouter = createTRPCRouter({
  getSaved: publicProcedure.input(z.object({ wordId: z.number().int().positive(), headword: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      const word = await ctx.db.query.words.findFirst({ where: eq(words.id, input.wordId), columns: { name: true } });
      if (!word || word.name !== input.headword) return null;

      // These recordings enter the table only after the existing admin moderation workflow.
      const [reviewed] = await ctx.db.select({ audioUrl: pronunciations.audioUrl })
        .from(pronunciations).where(eq(pronunciations.wordId, input.wordId)).orderBy(desc(pronunciations.id)).limit(1);
      if (reviewed) return { ...reviewed, source: "reviewed" as const };

      const [saved] = await ctx.db.select({ audioUrl: pronunciationAssets.audioUrl })
        .from(wordPronunciationAudio).innerJoin(pronunciationAssets, eq(wordPronunciationAudio.assetKey, pronunciationAssets.key))
        .where(and(eq(wordPronunciationAudio.wordId, input.wordId), eq(wordPronunciationAudio.headword, word.name))).limit(1);
      return saved ? { ...saved, source: "ai" as const } : null;
    }),
});
