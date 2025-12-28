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

    /**
     * Get words for matching game (pairs of word-meaning)
     */
    getWordsForMatching: publicProcedure
        .input(
            z.object({
                pairCount: z.number().min(4).max(10).default(6),
                source: z.enum(["all", "saved"]).default("all"),
            })
        )
        .query(async ({ input, ctx: { db, session } }) => {
            const { pairCount, source } = input;

            // If source is "saved", user must be authenticated
            if (source === "saved") {
                if (!session?.user?.id) {
                    return { pairs: [], error: "authRequired" };
                }

                // Get saved words for the user
                const savedWordIds = await db
                    .select({ wordId: savedWords.wordId })
                    .from(savedWords)
                    .where(eq(savedWords.userId, session.user.id));

                if (savedWordIds.length === 0) {
                    return { pairs: [], error: "noSavedWords" };
                }

                const wordIds = savedWordIds.map((sw) => sw.wordId);

                // Get words with their first meaning
                const result = await db
                    .select({
                        id: words.id,
                        name: words.name,
                        meaning: meanings.meaning,
                    })
                    .from(words)
                    .innerJoin(meanings, eq(meanings.wordId, words.id))
                    .where(inArray(words.id, wordIds))
                    .orderBy(asc(meanings.order))
                    .limit(pairCount * 2);

                // Deduplicate by word id
                const seenIds = new Set<number>();
                const uniqueWords = result.filter((row) => {
                    if (seenIds.has(row.id)) return false;
                    seenIds.add(row.id);
                    return true;
                });

                // Shuffle and take pairCount
                const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5).slice(0, pairCount);

                return {
                    pairs: shuffled.map((row) => ({
                        id: row.id,
                        word: row.name,
                        meaning: row.meaning,
                    })),
                    error: null,
                };
            }

            // Get random words from all words
            const result = await db
                .select({
                    id: words.id,
                    name: words.name,
                    meaning: meanings.meaning,
                })
                .from(words)
                .innerJoin(meanings, eq(meanings.wordId, words.id))
                .where(isNotNull(meanings.meaning))
                .orderBy(sql`RANDOM()`)
                .limit(pairCount * 3);

            // Deduplicate by word id
            const seenIds = new Set<number>();
            const uniqueWords = result.filter((row) => {
                if (seenIds.has(row.id)) return false;
                seenIds.add(row.id);
                return true;
            });

            // Take pairCount words
            const finalPairs = uniqueWords.slice(0, pairCount);

            return {
                pairs: finalPairs.map((row) => ({
                    id: row.id,
                    word: row.name,
                    meaning: row.meaning,
                })),
                error: null,
            };
        }),

    /**
     * Get words for speed round game (word with correct meaning + decoys)
     */
    getWordsForSpeedRound: publicProcedure
        .input(
            z.object({
                questionCount: z.number().min(5).max(30).default(10),
                source: z.enum(["all", "saved"]).default("all"),
            })
        )
        .query(async ({ input, ctx: { db, session } }) => {
            const { questionCount, source } = input;

            // Get all meanings for decoys (we need a pool of random meanings)
            const allMeanings = await db
                .select({ meaning: meanings.meaning })
                .from(meanings)
                .where(isNotNull(meanings.meaning))
                .orderBy(sql`RANDOM()`)
                .limit(200);

            const meaningPool = allMeanings.map((m) => m.meaning).filter(Boolean) as string[];

            // If source is "saved", user must be authenticated
            if (source === "saved") {
                if (!session?.user?.id) {
                    return { questions: [], error: "authRequired" };
                }

                const savedWordIds = await db
                    .select({ wordId: savedWords.wordId })
                    .from(savedWords)
                    .where(eq(savedWords.userId, session.user.id));

                if (savedWordIds.length === 0) {
                    return { questions: [], error: "noSavedWords" };
                }

                const wordIds = savedWordIds.map((sw) => sw.wordId);

                const result = await db
                    .select({
                        id: words.id,
                        name: words.name,
                        meaning: meanings.meaning,
                    })
                    .from(words)
                    .innerJoin(meanings, eq(meanings.wordId, words.id))
                    .where(inArray(words.id, wordIds))
                    .orderBy(asc(meanings.order))
                    .limit(questionCount * 2);

                // Deduplicate by word id
                const seenIds = new Set<number>();
                const uniqueWords = result.filter((row) => {
                    if (seenIds.has(row.id)) return false;
                    seenIds.add(row.id);
                    return true;
                });

                const shuffled = [...uniqueWords].sort(() => Math.random() - 0.5).slice(0, questionCount);

                return {
                    questions: shuffled.map((row) => {
                        const correctMeaning = row.meaning;
                        // Get 3 random decoy meanings (not the correct one)
                        const decoys = meaningPool
                            .filter((m) => m !== correctMeaning)
                            .sort(() => Math.random() - 0.5)
                            .slice(0, 3);

                        // Shuffle all 4 options
                        const options = [correctMeaning, ...decoys].sort(() => Math.random() - 0.5);

                        return {
                            id: row.id,
                            word: row.name,
                            correctMeaning,
                            options,
                        };
                    }),
                    error: null,
                };
            }

            // Get random words from all words
            const result = await db
                .select({
                    id: words.id,
                    name: words.name,
                    meaning: meanings.meaning,
                })
                .from(words)
                .innerJoin(meanings, eq(meanings.wordId, words.id))
                .where(isNotNull(meanings.meaning))
                .orderBy(sql`RANDOM()`)
                .limit(questionCount * 3);

            // Deduplicate by word id
            const seenIds = new Set<number>();
            const uniqueWords = result.filter((row) => {
                if (seenIds.has(row.id)) return false;
                seenIds.add(row.id);
                return true;
            });

            const finalQuestions = uniqueWords.slice(0, questionCount);

            return {
                questions: finalQuestions.map((row) => {
                    const correctMeaning = row.meaning;
                    // Get 3 random decoy meanings (not the correct one)
                    const decoys = meaningPool
                        .filter((m) => m !== correctMeaning)
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 3);

                    // Shuffle all 4 options
                    const options = [correctMeaning, ...decoys].sort(() => Math.random() - 0.5);

                    return {
                        id: row.id,
                        word: row.name,
                        correctMeaning,
                        options,
                    };
                }),
                error: null,
            };
        }),
});

