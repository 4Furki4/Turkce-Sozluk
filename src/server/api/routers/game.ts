import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { savedWords } from "@/db/schema/saved_words";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { eq, sql, inArray, isNotNull, asc } from "drizzle-orm";

export const gameRouter = createTRPCRouter({
    /**
     * Get random words with meanings for flashcard game
     */
    getRandomWordsForFlashcards: publicProcedure
        .input(
            z.object({
                count: z.number().min(5).max(100).default(10),
                source: z.enum(["all", "saved"]).default("all"),
            })
        )
        .query(async ({ input, ctx: { db, session } }) => {
            const { count, source } = input;

            // If source is "saved", user must be authenticated
            if (source === "saved") {
                if (!session?.user?.id) {
                    return { words: [], error: "authRequired" };
                }

                // Get saved words for the user
                const savedWordIds = await db
                    .select({ wordId: savedWords.wordId })
                    .from(savedWords)
                    .where(eq(savedWords.userId, session.user.id));

                if (savedWordIds.length === 0) {
                    return { words: [], error: "noSavedWords" };
                }

                const wordIds = savedWordIds.map((sw) => sw.wordId);

                // Get words with their first meaning using Drizzle ORM
                const result = await db
                    .select({
                        id: words.id,
                        name: words.name,
                        phonetic: words.phonetic,
                        meaning: meanings.meaning,
                        partOfSpeech: partOfSpeechs.partOfSpeech,
                    })
                    .from(words)
                    .innerJoin(meanings, eq(meanings.wordId, words.id))
                    .leftJoin(partOfSpeechs, eq(meanings.partOfSpeechId, partOfSpeechs.id))
                    .where(inArray(words.id, wordIds))
                    .orderBy(asc(meanings.order))
                    .limit(count * 2); // Get more to ensure uniqueness after dedup

                // Deduplicate by word id (keep first meaning)
                const seenIds = new Set<number>();
                const uniqueWords = result.filter((row) => {
                    if (seenIds.has(row.id)) return false;
                    seenIds.add(row.id);
                    return true;
                });

                // Shuffle the results
                const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5).slice(0, count);

                return {
                    words: shuffled.map((row) => ({
                        id: row.id,
                        name: row.name,
                        phonetic: row.phonetic,
                        meaning: row.meaning,
                        partOfSpeech: row.partOfSpeech,
                    })),
                    error: null,
                };
            }

            // Get random words from all words using Drizzle ORM
            const result = await db
                .select({
                    id: words.id,
                    name: words.name,
                    phonetic: words.phonetic,
                    meaning: meanings.meaning,
                    partOfSpeech: partOfSpeechs.partOfSpeech,
                })
                .from(words)
                .innerJoin(meanings, eq(meanings.wordId, words.id))
                .leftJoin(partOfSpeechs, eq(meanings.partOfSpeechId, partOfSpeechs.id))
                .where(isNotNull(meanings.meaning))
                .orderBy(sql`RANDOM()`)
                .limit(count * 3); // Get more to ensure uniqueness after dedup

            // Deduplicate by word id (keep first meaning)
            const seenIds = new Set<number>();
            const uniqueWords = result.filter((row) => {
                if (seenIds.has(row.id)) return false;
                seenIds.add(row.id);
                return true;
            });

            // Take the requested count
            const finalWords = uniqueWords.slice(0, count);

            return {
                words: finalWords.map((row) => ({
                    id: row.id,
                    name: row.name,
                    phonetic: row.phonetic,
                    meaning: row.meaning,
                    partOfSpeech: row.partOfSpeech,
                })),
                error: null,
            };
        }),
});

