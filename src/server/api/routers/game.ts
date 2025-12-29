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

    /**
     * Submit a game score for leaderboard
     */
    submitScore: publicProcedure
        .input(
            z.object({
                gameType: z.enum(["speed_round", "word_matching", "flashcard"]),
                score: z.number().min(0),
                accuracy: z.number().min(0).max(100),
                maxStreak: z.number().min(0).default(0),
                questionCount: z.number().min(1),
                timeTaken: z.number().min(0), // seconds
            })
        )
        .mutation(async ({ input, ctx: { db, session } }) => {
            // Require authentication
            if (!session?.user?.id) {
                return { success: false, error: "authRequired", rank: null };
            }

            const { gameType, score, accuracy, maxStreak, questionCount, timeTaken } = input;

            // Import gameScores table
            const { gameScores } = await import("@/db/schema/game_scores");

            // Insert the score
            await db.insert(gameScores).values({
                userId: session.user.id,
                gameType,
                score,
                accuracy,
                maxStreak,
                questionCount,
                timeTaken,
            });

            // Get user's rank for this game type
            const rankResult = await db.execute(sql`
                WITH ranked_scores AS (
                    SELECT 
                        user_id,
                        MAX(score) as best_score,
                        RANK() OVER (ORDER BY MAX(score) DESC) as rank
                    FROM game_scores
                    WHERE game_type = ${gameType}
                    GROUP BY user_id
                )
                SELECT rank FROM ranked_scores WHERE user_id = ${session.user.id}
            `);

            const rank = rankResult[0]?.rank ?? null;

            return { success: true, error: null, rank: Number(rank) };
        }),

    /**
     * Get leaderboard for a specific game type
     */
    getLeaderboard: publicProcedure
        .input(
            z.object({
                gameType: z.enum(["speed_round", "word_matching", "flashcard"]),
                limit: z.number().min(1).max(50).default(10),
            })
        )
        .query(async ({ input, ctx: { db } }) => {
            const { gameType, limit } = input;

            // Import tables
            const { gameScores } = await import("@/db/schema/game_scores");
            const { users } = await import("@/db/schema/users");

            // Get top scores with user info (best score per user)
            const result = await db.execute(sql`
                SELECT 
                    gs.user_id,
                    u.name as user_name,
                    u.image as user_image,
                    MAX(gs.score) as best_score,
                    MAX(gs.accuracy) as best_accuracy,
                    MAX(gs.max_streak) as best_streak,
                    COUNT(gs.id) as games_played
                FROM game_scores gs
                JOIN users u ON gs.user_id = u.id
                WHERE gs.game_type = ${gameType}
                GROUP BY gs.user_id, u.name, u.image
                ORDER BY best_score DESC
                LIMIT ${limit}
            `);

            return {
                leaderboard: result.map((row: any, index: number) => ({
                    rank: index + 1,
                    userId: row.user_id,
                    userName: row.user_name,
                    userImage: row.user_image,
                    bestScore: Number(row.best_score),
                    bestAccuracy: Number(row.best_accuracy),
                    bestStreak: Number(row.best_streak),
                    gamesPlayed: Number(row.games_played),
                })),
            };
        }),

    /**
     * Get current user's rank and stats for a game type
     */
    getUserGameStats: publicProcedure
        .input(
            z.object({
                gameType: z.enum(["speed_round", "word_matching", "flashcard"]),
            })
        )
        .query(async ({ input, ctx: { db, session } }) => {
            if (!session?.user?.id) {
                return { rank: null, stats: null };
            }

            const { gameType } = input;

            // Get user's best score and rank
            const result = await db.execute(sql`
                WITH ranked_scores AS (
                    SELECT 
                        user_id,
                        MAX(score) as best_score,
                        MAX(accuracy) as best_accuracy,
                        MAX(max_streak) as best_streak,
                        COUNT(id) as games_played,
                        RANK() OVER (ORDER BY MAX(score) DESC) as rank
                    FROM game_scores
                    WHERE game_type = ${gameType}
                    GROUP BY user_id
                )
                SELECT * FROM ranked_scores WHERE user_id = ${session.user.id}
            `);

            if (result.length === 0) {
                return { rank: null, stats: null };
            }

            const row: any = result[0];
            return {
                rank: Number(row.rank),
                stats: {
                    bestScore: Number(row.best_score),
                    bestAccuracy: Number(row.best_accuracy),
                    bestStreak: Number(row.best_streak),
                    gamesPlayed: Number(row.games_played),
                },
            };
        }),
});

