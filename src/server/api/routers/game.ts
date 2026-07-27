import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { relatedWords } from "@/db/schema/related_words";
import { savedWords } from "@/db/schema/saved_words";
import { partOfSpeechs } from "@/db/schema/part_of_speechs";
import { users } from "@/db/schema/users";
import { gameScores } from "@/db/schema/game_scores";
import { gameSessionEvents, gameSessions, type GameSessionSettings } from "@/db/schema/game_sessions";
import {
    flashcardReviewEvents,
    flashcardReviewStates,
    type FlashcardReviewEventOutcome,
} from "@/db/schema/flashcard_reviews";
import {
    createVerifiedGameScore,
    getPlayableSpeedRoundQuestion,
    isCompetitiveSpeedRoundRuleset,
    isCompetitiveWordMatchingRuleset,
    resolveSpeedRoundAnswer,
    resolveWordMatchingAttempt,
    scheduleFlashcardReview,
    type FlashcardRating,
    type VerifiedGameScore,
} from "@/src/lib/game";
import {
    createSpeedRoundSnapshot,
    createWordMatchingReview,
    createWordMatchingSnapshot,
    redactWordMatchingBoard,
    type MeaningCandidate,
    type RoundCandidate,
    type SpeedRoundSnapshot,
    type WordMatchingReviewPair,
    type WordMatchingSnapshot,
    type WordMatchingWrongAttempt,
} from "@/src/server/game/session-rounds";
import {
    toSpeedRoundProgress,
    toSpeedRoundSessionSnapshot,
    toWordMatchingProgress,
    toWordMatchingSessionSnapshot,
} from "@/src/server/game/rated-session-state";
import { isSameFlashcardReviewAction } from "@/src/server/game/flashcard-review-actions";
import { and, asc, eq, gt, inArray, isNotNull, lte, sql } from "drizzle-orm";

const gameSourceSchema = z.enum(["all", "saved"]);
const flashcardDirectionSchema = z.enum(["word", "meaning"]);
const flashcardRatingSchema = z.enum(["again", "hard", "good", "easy"]);

const speedRoundSessionInput = z.object({
    questionCount: z.number().int().min(5).max(30).default(10),
    timePerQuestion: z.number().int().min(5).max(15).default(10),
    source: gameSourceSchema.default("all"),
});

const wordMatchingSessionInput = z.object({
    pairCount: z.number().int().min(4).max(10).default(6),
    source: gameSourceSchema.default("all"),
    mode: z.enum(["relaxed", "timed"]).default("relaxed"),
});

type GameDatabase = typeof import("@/db").db;

type PlayableSpeedQuestion = {
    token: string;
    word: string;
    options: readonly { token: string; text: string }[];
};

type SpeedRoundActionOutcome = {
    expired: boolean;
    completed: boolean;
    /** The browser reached its conservative display deadline before the persisted deadline. */
    timeoutNotReady?: boolean;
    isCorrect?: boolean;
    timedOut?: boolean;
    pointsEarned?: number;
    timeSpentMs?: number;
    questionToken?: string;
    /** Returned only after an answer, for the existing review save action. */
    wordId?: number | null;
    correctMeaning?: string | null;
    /** Returned only after the action is resolved, for visual feedback. */
    correctOptionToken?: string | null;
    score?: number;
    streak?: number;
    maxStreak?: number;
    correctCount?: number;
    nextQuestion?: PlayableSpeedQuestion | null;
    /** ISO text survives JSONB idempotency replays without date hydration. */
    nextDeadlineAt?: string | null;
    /** Server time used by the browser to render a clock without local skew. */
    serverNow?: string;
    finalResult?: VerifiedGameScore | null;
    rank?: number | null;
};

type WordMatchingActionOutcome = {
    expired: boolean;
    completed: boolean;
    isCorrect?: boolean;
    pointsEarned?: number;
    score?: number;
    mistakes?: number;
    matchedWordTokens?: readonly string[];
    /** The matching meaning tiles are revealed only after a confirmed pair. */
    matchedMeaningTokens?: readonly string[];
    /** Completion time is always server-derived, even for practice sessions. */
    timeTakenSeconds?: number | null;
    finalResult?: VerifiedGameScore | null;
    rank?: number | null;
    /** The authoritative answer map is attached only to terminal outcomes. */
    review?: readonly WordMatchingReviewPair[];
};

function distinctCandidates(rows: RoundCandidate[]) {
    const seen = new Set<number>();
    return rows.filter((row) => {
        if (seen.has(row.wordId)) return false;
        seen.add(row.wordId);
        return true;
    });
}

async function getRoundCandidates(
    db: GameDatabase,
    userId: string,
    source: "all" | "saved",
    count: number,
) {
    const selection = {
        wordId: words.id,
        word: words.name,
        meaningId: meanings.id,
        meaning: meanings.meaning,
        partOfSpeechId: meanings.partOfSpeechId,
    };

    // Snapshot builders discard visually duplicated labels, so sample beyond
    // the requested board size before choosing server-owned pairs/questions.
    const candidateSampleSize = Math.max(count * 3, count + 12);
    const selectedWordIds = source === "saved"
        ? await db
            .select({ wordId: savedWords.wordId })
            .from(savedWords)
            .innerJoin(words, eq(savedWords.wordId, words.id))
            .innerJoin(meanings, eq(meanings.wordId, words.id))
            .where(and(eq(savedWords.userId, userId), isNotNull(meanings.meaning)))
            .groupBy(savedWords.wordId)
            .orderBy(sql`RANDOM()`)
            .limit(candidateSampleSize)
        : await db
            .select({ wordId: words.id })
            .from(words)
            .innerJoin(meanings, eq(meanings.wordId, words.id))
            .where(isNotNull(meanings.meaning))
            .groupBy(words.id)
            .orderBy(sql`RANDOM()`)
            .limit(candidateSampleSize);

    const wordIds = selectedWordIds.map((row) => row.wordId);
    if (wordIds.length === 0) return [];

    const candidates = await db
        .select(selection)
        .from(words)
        .innerJoin(meanings, eq(meanings.wordId, words.id))
        .where(and(inArray(words.id, wordIds), isNotNull(meanings.meaning)))
        .orderBy(asc(meanings.order));

    return distinctCandidates(candidates);
}

async function getMeaningDecoys(
    db: GameDatabase,
    count: number,
    targetWordIds: readonly number[],
): Promise<MeaningCandidate[]> {
    const decoySampleSize = Math.max(160, count * 24);
    const randomDecoys = await db
        .select({
            meaningId: meanings.id,
            meaning: meanings.meaning,
            wordId: words.id,
            word: words.name,
            partOfSpeechId: meanings.partOfSpeechId,
        })
        .from(meanings)
        .innerJoin(words, eq(meanings.wordId, words.id))
        .where(isNotNull(meanings.meaning))
        .orderBy(sql`RANDOM()`)
        .limit(decoySampleSize);

    // The relation graph gives us a real semantic signal when it is available.
    // Obsolete entries are deliberately excluded: they are useful dictionary
    // metadata, but misleading as a live answer alternative.
    const relationDecoys = targetWordIds.length === 0
        ? []
        : (await Promise.all([
            db
                .select({
                    targetWordId: relatedWords.wordId,
                    meaningId: meanings.id,
                    meaning: meanings.meaning,
                    wordId: words.id,
                    word: words.name,
                    partOfSpeechId: meanings.partOfSpeechId,
                })
                .from(relatedWords)
                .innerJoin(words, eq(relatedWords.relatedWordId, words.id))
                .innerJoin(meanings, eq(meanings.wordId, words.id))
                .where(and(
                    inArray(relatedWords.wordId, [...targetWordIds]),
                    inArray(relatedWords.relationType, ["relatedWord", "see_also", "turkish_equivalent"]),
                    isNotNull(meanings.meaning),
                ))
                .orderBy(sql`RANDOM()`)
                .limit(decoySampleSize),
            db
                .select({
                    targetWordId: relatedWords.relatedWordId,
                    meaningId: meanings.id,
                    meaning: meanings.meaning,
                    wordId: words.id,
                    word: words.name,
                    partOfSpeechId: meanings.partOfSpeechId,
                })
                .from(relatedWords)
                .innerJoin(words, eq(relatedWords.wordId, words.id))
                .innerJoin(meanings, eq(meanings.wordId, words.id))
                .where(and(
                    inArray(relatedWords.relatedWordId, [...targetWordIds]),
                    inArray(relatedWords.relationType, ["relatedWord", "see_also", "turkish_equivalent"]),
                    isNotNull(meanings.meaning),
                ))
                .orderBy(sql`RANDOM()`)
                .limit(decoySampleSize),
        ])).flat();

    const decoysByMeaningId = new Map<number, MeaningCandidate>();
    for (const decoy of randomDecoys) {
        decoysByMeaningId.set(decoy.meaningId, { ...decoy, relatedToWordIds: [] });
    }
    for (const decoy of relationDecoys) {
        const existing = decoysByMeaningId.get(decoy.meaningId);
        const relatedToWordIds = new Set(existing?.relatedToWordIds ?? []);
        relatedToWordIds.add(decoy.targetWordId);
        decoysByMeaningId.set(decoy.meaningId, {
            meaningId: decoy.meaningId,
            meaning: decoy.meaning,
            wordId: decoy.wordId,
            word: decoy.word,
            partOfSpeechId: decoy.partOfSpeechId,
            relatedToWordIds: [...relatedToWordIds],
        });
    }

    return [...decoysByMeaningId.values()];
}

function sessionExpiry(now: Date, minimumMinutes = 10) {
    return new Date(now.getTime() + minimumMinutes * 60 * 1000);
}

function elapsedSeconds(startedAt: Date, endedAt: Date) {
    return Math.max(0, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 1000));
}

function sessionError(code: string): never {
    const errorCode = code === "session_not_found" ? "NOT_FOUND" : "CONFLICT";
    throw new TRPCError({ code: errorCode, message: `Game session ${code}` });
}

async function getVerifiedRank(
    db: Pick<GameDatabase, "execute">,
    gameType: "speed_round" | "word_matching",
    userId: string,
) {
    const rows = await db.execute(sql`
        WITH verified_scores AS (
            SELECT gs.*,
                ROW_NUMBER() OVER (
                    PARTITION BY gs.user_id
                    ORDER BY gs.score DESC, gs.created_at ASC, gs.id ASC
                ) AS best_run
            FROM game_scores gs
            WHERE gs.game_type = ${gameType} AND gs.verified = true AND gs.session_id IS NOT NULL
        ), ranked_scores AS (
            SELECT
                user_id,
                ROW_NUMBER() OVER (ORDER BY score DESC, created_at ASC, id ASC) AS rank
            FROM verified_scores
            WHERE best_run = 1
        )
        SELECT rank FROM ranked_scores WHERE user_id = ${userId}
    `);

    return rows[0]?.rank ? Number(rows[0].rank) : null;
}

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
                        meaningId: meanings.id,
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
                        meaningId: row.meaningId,
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
                    meaningId: meanings.id,
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
                    meaningId: row.meaningId,
                    name: row.name,
                    phonetic: row.phonetic,
                    meaning: row.meaning,
                    partOfSpeech: row.partOfSpeech,
                })),
                error: null,
            };
        }),

    /** Summary deliberately distinguishes a new learner from a caught-up one. */
    getFlashcardReviewSummary: protectedProcedure
        .query(async ({ ctx: { db, session } }) => {
            const now = new Date();
            const [counts] = await db
                .select({
                    totalCount: sql<number>`count(*)`.mapWith(Number),
                    dueCount: sql<number>`count(*) filter (where ${flashcardReviewStates.dueAt} <= ${now})`.mapWith(Number),
                })
                .from(flashcardReviewStates)
                .where(eq(flashcardReviewStates.userId, session.user.id));
            const [nextReview] = await db
                .select({ dueAt: flashcardReviewStates.dueAt })
                .from(flashcardReviewStates)
                .where(and(
                    eq(flashcardReviewStates.userId, session.user.id),
                    gt(flashcardReviewStates.dueAt, now),
                ))
                .orderBy(asc(flashcardReviewStates.dueAt))
                .limit(1);

            return {
                totalCount: counts?.totalCount ?? 0,
                dueCount: counts?.dueCount ?? 0,
                nextDueAt: nextReview?.dueAt ?? null,
            };
        }),

    /**
     * A due queue preserves the exact meaning and prompt direction that were
     * previously rated. It is not based on saved words, so unsaving a word
     * never erases or hides learning history.
     */
    getDueFlashcardReviews: protectedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(10) }))
        .query(async ({ input, ctx: { db, session } }) => {
            const now = new Date();
            const dueWhere = and(
                eq(flashcardReviewStates.userId, session.user.id),
                lte(flashcardReviewStates.dueAt, now),
            );
            const [countResult] = await db
                .select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(flashcardReviewStates)
                .where(dueWhere);
            const cards = await db
                .select({
                    id: words.id,
                    meaningId: meanings.id,
                    name: words.name,
                    phonetic: words.phonetic,
                    meaning: meanings.meaning,
                    partOfSpeech: partOfSpeechs.partOfSpeech,
                    direction: flashcardReviewStates.direction,
                    dueAt: flashcardReviewStates.dueAt,
                })
                .from(flashcardReviewStates)
                .innerJoin(meanings, eq(flashcardReviewStates.meaningId, meanings.id))
                .innerJoin(words, eq(meanings.wordId, words.id))
                .leftJoin(partOfSpeechs, eq(meanings.partOfSpeechId, partOfSpeechs.id))
                .where(dueWhere)
                .orderBy(
                    asc(flashcardReviewStates.dueAt),
                    asc(flashcardReviewStates.meaningId),
                    asc(flashcardReviewStates.direction),
                )
                .limit(input.limit);

            return {
                cards,
                totalDueCount: countResult?.count ?? 0,
            };
        }),

    /**
     * Atomically rate one revealed card. State is locked per user so two tabs
     * cannot derive transitions from the same prior interval; the immutable
     * action event makes a lost client response safe to replay.
     */
    rateFlashcardReview: protectedProcedure
        .input(z.object({
            meaningId: z.number().int().positive(),
            direction: flashcardDirectionSchema,
            rating: flashcardRatingSchema,
            actionId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx: { db, session } }) => db.transaction(async (tx) => {
            // Serialize a learner's ratings. This handles both duplicate action
            // IDs and different concurrent ratings for the same card without a
            // client-provided version or timestamp.
            const [lockedUser] = await tx
                .select({ id: users.id })
                .from(users)
                .where(eq(users.id, session.user.id))
                .for("update")
                .limit(1);
            if (!lockedUser) {
                throw new TRPCError({ code: "UNAUTHORIZED", message: "Flashcard learner not found" });
            }

            const [previousEvent] = await tx
                .select({
                    meaningId: flashcardReviewEvents.meaningId,
                    direction: flashcardReviewEvents.direction,
                    rating: flashcardReviewEvents.rating,
                    outcome: flashcardReviewEvents.outcome,
                })
                .from(flashcardReviewEvents)
                .where(and(
                    eq(flashcardReviewEvents.userId, session.user.id),
                    eq(flashcardReviewEvents.actionId, input.actionId),
                ))
                .limit(1);
            if (previousEvent) {
                if (!isSameFlashcardReviewAction(previousEvent, input)) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "Flashcard review action ID was already used for another rating",
                    });
                }

                return previousEvent.outcome as FlashcardReviewEventOutcome;
            }

            const [card] = await tx
                .select({ meaningId: meanings.id })
                .from(meanings)
                .innerJoin(words, eq(meanings.wordId, words.id))
                .where(eq(meanings.id, input.meaningId))
                .limit(1);
            if (!card) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Flashcard meaning not found" });
            }

            const [previousState] = await tx
                .select()
                .from(flashcardReviewStates)
                .where(and(
                    eq(flashcardReviewStates.userId, session.user.id),
                    eq(flashcardReviewStates.meaningId, input.meaningId),
                    eq(flashcardReviewStates.direction, input.direction),
                ))
                .for("update")
                .limit(1);

            const now = new Date();
            const nextState = scheduleFlashcardReview(
                previousState ? {
                    repetitions: previousState.repetitions,
                    lapses: previousState.lapses,
                    easeFactor: previousState.easeFactor,
                    intervalDays: previousState.intervalDays,
                } : null,
                input.rating as FlashcardRating,
                now,
            );
            const outcome: FlashcardReviewEventOutcome = {
                meaningId: card.meaningId,
                direction: input.direction,
                rating: input.rating,
                dueAt: nextState.dueAt.toISOString(),
                repetitions: nextState.repetitions,
                lapses: nextState.lapses,
                easeFactor: nextState.easeFactor,
                intervalDays: nextState.intervalDays,
            };

            if (previousState) {
                await tx
                    .update(flashcardReviewStates)
                    .set({
                        ...nextState,
                        lastReviewedAt: now,
                        updatedAt: now,
                    })
                    .where(and(
                        eq(flashcardReviewStates.userId, session.user.id),
                        eq(flashcardReviewStates.meaningId, input.meaningId),
                        eq(flashcardReviewStates.direction, input.direction),
                    ));
            } else {
                await tx.insert(flashcardReviewStates).values({
                    userId: session.user.id,
                    meaningId: input.meaningId,
                    direction: input.direction,
                    ...nextState,
                    lastReviewedAt: now,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await tx.insert(flashcardReviewEvents).values({
                userId: session.user.id,
                meaningId: input.meaningId,
                direction: input.direction,
                rating: input.rating,
                actionId: input.actionId,
                outcome,
                createdAt: now,
            });

            return outcome;
        })),

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
            if (source === "saved" && !session?.user?.id) {
                return { questions: [], error: "authRequired" };
            }

            const candidates = await getRoundCandidates(
                db,
                session?.user?.id ?? "",
                source,
                questionCount,
            );
            if (candidates.length < questionCount) {
                return { questions: [], error: source === "saved" ? "noSavedWords" : "noWords" };
            }

            const snapshot = createSpeedRoundSnapshot(
                candidates,
                await getMeaningDecoys(db, questionCount, candidates.map((candidate) => candidate.wordId)),
                questionCount,
            );
            if (!snapshot) {
                return { questions: [], error: source === "saved" ? "noSavedWords" : "noWords" };
            }

            return {
                // Guest rounds are explicitly unranked practice, so they can
                // receive the correct label for client-side feedback. Rated
                // sessions below retain only opaque option tokens.
                questions: snapshot.questions.map((question) => ({
                    id: question.wordId,
                    word: question.word,
                    correctMeaning: question.options.find((option) => option.token === question.correctOptionToken)?.meaning ?? "",
                    options: question.options.map((option) => option.meaning),
                })),
                error: null,
            };
        }),

    /**
     * Creates a signed-in, server-owned Speed Round. Its answer key remains in
     * the persisted snapshot; the browser only receives the first playable
     * question and opaque option tokens.
     */
    startSpeedRoundSession: protectedProcedure
        .input(speedRoundSessionInput)
        .mutation(async ({ input, ctx: { db, session } }) => {
            const candidates = await getRoundCandidates(db, session.user.id, input.source, input.questionCount);
            if (candidates.length < input.questionCount) {
                return { sessionId: null, error: input.source === "saved" ? "noSavedWords" : "noWords" };
            }

            const snapshot = createSpeedRoundSnapshot(
                candidates,
                await getMeaningDecoys(db, input.questionCount, candidates.map((candidate) => candidate.wordId)),
                input.questionCount,
            );
            if (!snapshot) {
                return { sessionId: null, error: input.source === "saved" ? "noSavedWords" : "noWords" };
            }

            const now = new Date();
            const deadlineAt = new Date(now.getTime() + input.timePerQuestion * 1000);
            const settings: GameSessionSettings = {
                source: input.source,
                questionCount: input.questionCount,
                timePerQuestion: input.timePerQuestion,
            };
            const [created] = await db.insert(gameSessions).values({
                userId: session.user.id,
                gameType: "speed_round",
                settings,
                snapshot,
                questionStartedAt: now,
                deadlineAt,
                expiresAt: sessionExpiry(now),
            }).returning();

            const scoringSnapshot = toSpeedRoundSessionSnapshot(snapshot, input.timePerQuestion);
            return {
                sessionId: created.id,
                error: null,
                question: getPlayableSpeedRoundQuestion(scoringSnapshot, 0),
                questionCount: input.questionCount,
                deadlineAt: deadlineAt.toISOString(),
                serverNow: now.toISOString(),
                score: 0,
                streak: 0,
            };
        }),

    /** Resolve exactly one server-timed Speed Round action. */
    answerSpeedRoundSession: protectedProcedure
        .input(z.object({
            sessionId: z.string().uuid(),
            actionId: z.string().uuid(),
            questionIndex: z.number().int().min(0),
            optionToken: z.string().uuid().nullable(),
            // The browser can ask to settle its displayed timer, but cannot
            // turn an early local clock into an early server timeout.
            timeout: z.boolean().default(false),
        }).refine(
            (input) => input.timeout ? input.optionToken === null : input.optionToken !== null,
            { message: "A timeout uses no option token; an answer requires one" },
        ))
        .mutation(async ({ input, ctx: { db, session } }) => db.transaction(async (tx) => {
            const [ownedSession] = await tx
                .select()
                .from(gameSessions)
                .where(and(eq(gameSessions.id, input.sessionId), eq(gameSessions.userId, session.user.id)))
                .for("update")
                .limit(1);

            if (!ownedSession || ownedSession.gameType !== "speed_round") sessionError("session_not_found");

            const [previousEvent] = await tx
                .select()
                .from(gameSessionEvents)
                .where(and(eq(gameSessionEvents.sessionId, ownedSession.id), eq(gameSessionEvents.actionId, input.actionId)))
                .limit(1);
            if (previousEvent) {
                const outcome = previousEvent.outcome as SpeedRoundActionOutcome;
                // The outcome itself is immutable for idempotency, but a retry
                // needs the current server clock to render any next deadline.
                return { ...outcome, serverNow: new Date().toISOString() };
            }

            const now = new Date();
            if (ownedSession.status !== "active") sessionError("session_not_active");
            if (now >= ownedSession.expiresAt) {
                const expired: SpeedRoundActionOutcome = { expired: true, completed: false };
                await tx.update(gameSessions).set({ status: "expired", completedAt: now, updatedAt: now }).where(eq(gameSessions.id, ownedSession.id));
                await tx.insert(gameSessionEvents).values({
                    sessionId: ownedSession.id,
                    actionId: input.actionId,
                    sequence: ownedSession.currentStep + 1,
                    eventType: "timeout",
                    payload: { questionIndex: input.questionIndex },
                    outcome: expired,
                });
                return expired;
            }

            const snapshot = ownedSession.snapshot as unknown as SpeedRoundSnapshot;
            const timePerQuestion = ownedSession.settings.timePerQuestion;
            if (!timePerQuestion) sessionError("invalid_session_state");
            if (input.timeout) {
                if (!ownedSession.deadlineAt) sessionError("invalid_session_state");
                if (now < ownedSession.deadlineAt) {
                    // The client countdown is deliberately conservative. Do not
                    // turn an early presentation timeout into a failed action:
                    // return the authoritative clock so the player can still
                    // answer during the server-valid remainder of the question.
                    return {
                        expired: false,
                        completed: false,
                        timeoutNotReady: true,
                        nextDeadlineAt: ownedSession.deadlineAt.toISOString(),
                        serverNow: now.toISOString(),
                    } satisfies SpeedRoundActionOutcome;
                }
            }
            const scoringSnapshot = toSpeedRoundSessionSnapshot(snapshot, timePerQuestion);
            const resolution = resolveSpeedRoundAnswer(
                scoringSnapshot,
                toSpeedRoundProgress(ownedSession),
                {
                    questionIndex: input.questionIndex,
                    optionToken: input.timeout ? null : input.optionToken,
                },
                now,
            );
            if (!resolution.ok) sessionError(resolution.error);

            const question = snapshot.questions[input.questionIndex];
            const correctOption = question?.options.find((option) => option.token === question.correctOptionToken);
            const completedAt = resolution.state.completedAt === null ? null : new Date(resolution.state.completedAt);
            const nextQuestion = resolution.completed
                ? null
                : getPlayableSpeedRoundQuestion(scoringSnapshot, resolution.state.currentStep);
            const verifiedScore = resolution.completed
                && isCompetitiveSpeedRoundRuleset(
                    scoringSnapshot.questions.length,
                    scoringSnapshot.timePerQuestionSeconds,
                    ownedSession.settings.source,
                )
                ? createVerifiedGameScore(scoringSnapshot, resolution.state)
                : null;

            const outcome: SpeedRoundActionOutcome = {
                expired: false,
                completed: resolution.completed,
                isCorrect: resolution.isCorrect,
                timedOut: resolution.timedOut,
                pointsEarned: resolution.pointsEarned,
                timeSpentMs: resolution.timeSpentMs,
                questionToken: resolution.questionToken,
                wordId: question?.wordId ?? null,
                correctMeaning: correctOption?.meaning ?? null,
                correctOptionToken: correctOption?.token ?? null,
                score: resolution.state.score,
                streak: resolution.state.streak,
                maxStreak: resolution.state.maxStreak,
                correctCount: resolution.state.correctCount,
                nextQuestion,
                nextDeadlineAt: resolution.completed ? null : new Date(resolution.state.deadlineAt).toISOString(),
                serverNow: now.toISOString(),
                finalResult: verifiedScore,
                rank: null as number | null,
            };

            await tx.update(gameSessions).set({
                status: resolution.state.status,
                currentStep: resolution.state.currentStep,
                questionStartedAt: new Date(resolution.occurredAt),
                deadlineAt: resolution.completed ? null : new Date(resolution.state.deadlineAt),
                streak: resolution.state.streak,
                maxStreak: resolution.state.maxStreak,
                score: resolution.state.score,
                correctCount: resolution.state.correctCount,
                elapsedMs: resolution.state.timeTakenMs,
                completedAt,
                updatedAt: now,
            }).where(eq(gameSessions.id, ownedSession.id));

            if (verifiedScore) {
                await tx.insert(gameScores).values({
                    userId: session.user.id,
                    sessionId: ownedSession.id,
                    gameType: verifiedScore.gameType,
                    score: verifiedScore.score,
                    accuracy: verifiedScore.accuracy,
                    maxStreak: verifiedScore.maxStreak,
                    questionCount: verifiedScore.questionCount,
                    timeTaken: verifiedScore.timeTakenSeconds,
                    verified: true,
                });
                outcome.rank = await getVerifiedRank(tx, "speed_round", session.user.id);
            }

            await tx.insert(gameSessionEvents).values({
                sessionId: ownedSession.id,
                actionId: input.actionId,
                sequence: ownedSession.currentStep + 1,
                eventType: resolution.timedOut ? "timeout" : "speed_answer",
                payload: {
                    questionIndex: input.questionIndex,
                    optionToken: input.optionToken,
                    timeout: input.timeout,
                },
                outcome,
                isCorrect: resolution.isCorrect,
                pointsEarned: resolution.pointsEarned,
                createdAt: new Date(resolution.occurredAt),
            });

            return outcome;
        })),

    /** Starts a signed-in rated Word Matching board with opaque tile tokens. */
    startWordMatchingSession: protectedProcedure
        .input(wordMatchingSessionInput)
        .mutation(async ({ input, ctx: { db, session } }) => {
            const candidates = await getRoundCandidates(db, session.user.id, input.source, input.pairCount);
            if (candidates.length < input.pairCount) {
                return { sessionId: null, error: input.source === "saved" ? "noSavedWords" : "noWords" };
            }

            const snapshot = createWordMatchingSnapshot(candidates, input.pairCount);
            if (!snapshot) {
                return { sessionId: null, error: input.source === "saved" ? "noSavedWords" : "noWords" };
            }

            const now = new Date();
            const timeLimitSeconds = input.mode === "timed" ? 60 : null;
            const deadlineAt = timeLimitSeconds === null ? null : new Date(now.getTime() + timeLimitSeconds * 1000);
            const settings: GameSessionSettings = {
                source: input.source,
                pairCount: input.pairCount,
                mode: input.mode,
            };
            const [created] = await db.insert(gameSessions).values({
                userId: session.user.id,
                gameType: "word_matching",
                settings,
                snapshot,
                questionStartedAt: now,
                deadlineAt,
                expiresAt: sessionExpiry(now, input.mode === "relaxed" ? 60 * 24 : 15),
            }).returning();

            return {
                sessionId: created.id,
                error: null,
                board: redactWordMatchingBoard(snapshot),
                deadlineAt: deadlineAt?.toISOString() ?? null,
                serverNow: now.toISOString(),
                score: 0,
                mistakes: 0,
            };
        }),

    /** Resolves one opaque Word Matching tile attempt server-side. */
    attemptWordMatchingSession: protectedProcedure
        .input(z.object({
            sessionId: z.string().uuid(),
            actionId: z.string().uuid(),
            // A pair of nulls is the client asking the server to settle the
            // timed board at its own deadline. Partial pairs are rejected.
            wordTileToken: z.string().uuid().nullable(),
            meaningTileToken: z.string().uuid().nullable(),
        }).refine(
            (input) => (input.wordTileToken === null) === (input.meaningTileToken === null),
            { message: "Word and meaning tile tokens must be supplied together" },
        ))
        .mutation(async ({ input, ctx: { db, session } }) => db.transaction(async (tx) => {
            const [ownedSession] = await tx
                .select()
                .from(gameSessions)
                .where(and(eq(gameSessions.id, input.sessionId), eq(gameSessions.userId, session.user.id)))
                .for("update")
                .limit(1);

            if (!ownedSession || ownedSession.gameType !== "word_matching") sessionError("session_not_found");

            const [previousEvent] = await tx
                .select()
                .from(gameSessionEvents)
                .where(and(eq(gameSessionEvents.sessionId, ownedSession.id), eq(gameSessionEvents.actionId, input.actionId)))
                .limit(1);
            if (previousEvent) return previousEvent.outcome as WordMatchingActionOutcome;

            const snapshot = ownedSession.snapshot as unknown as WordMatchingSnapshot;
            const buildTerminalReview = async (matchedWordTokens: readonly string[]) => {
                const wrongEvents = await tx
                    .select({ payload: gameSessionEvents.payload })
                    .from(gameSessionEvents)
                    .where(and(
                        eq(gameSessionEvents.sessionId, ownedSession.id),
                        eq(gameSessionEvents.isCorrect, false),
                    ));
                const wrongAttempts = wrongEvents.flatMap(({ payload }) => {
                    const wordToken = payload.wordTileToken;
                    const meaningToken = payload.meaningTileToken;
                    return typeof wordToken === "string" && typeof meaningToken === "string"
                        ? [{ wordToken, meaningToken } satisfies WordMatchingWrongAttempt]
                        : [];
                });

                return createWordMatchingReview(snapshot, matchedWordTokens, wrongAttempts);
            };
            const matchedMeaningTokens = (matchedWordTokens: readonly string[]) => snapshot.pairs
                .filter((pair) => matchedWordTokens.includes(pair.wordToken))
                .map((pair) => pair.meaningToken);

            const now = new Date();
            if (ownedSession.status !== "active") sessionError("session_not_active");
            if (now >= ownedSession.expiresAt) {
                const expired: WordMatchingActionOutcome = {
                    expired: true,
                    completed: false,
                    timeTakenSeconds: elapsedSeconds(
                        ownedSession.questionStartedAt,
                        ownedSession.deadlineAt ?? now,
                    ),
                    score: ownedSession.score,
                    mistakes: ownedSession.mistakeCount,
                    matchedWordTokens: ownedSession.matchedTokens,
                    matchedMeaningTokens: matchedMeaningTokens(ownedSession.matchedTokens),
                    review: await buildTerminalReview(ownedSession.matchedTokens),
                };
                await tx.update(gameSessions).set({ status: "expired", completedAt: now, updatedAt: now }).where(eq(gameSessions.id, ownedSession.id));
                await tx.insert(gameSessionEvents).values({
                    sessionId: ownedSession.id,
                    actionId: input.actionId,
                    sequence: ownedSession.currentStep + ownedSession.mistakeCount + 1,
                    eventType: "timeout",
                    payload: { wordTileToken: input.wordTileToken, meaningTileToken: input.meaningTileToken },
                    outcome: expired,
                });
                return expired;
            }

            if (input.wordTileToken === null && input.meaningTileToken === null) {
                // The browser countdown is only a prompt to settle. A client
                // cannot declare a timeout before the persisted server deadline.
                if (!ownedSession.deadlineAt || now < ownedSession.deadlineAt) {
                    sessionError("session_not_expired");
                }

                const expired: WordMatchingActionOutcome = {
                    expired: true,
                    completed: false,
                    timeTakenSeconds: elapsedSeconds(ownedSession.questionStartedAt, ownedSession.deadlineAt),
                    score: ownedSession.score,
                    mistakes: ownedSession.mistakeCount,
                    matchedWordTokens: ownedSession.matchedTokens,
                    matchedMeaningTokens: matchedMeaningTokens(ownedSession.matchedTokens),
                    review: await buildTerminalReview(ownedSession.matchedTokens),
                };
                await tx.update(gameSessions).set({
                    status: "expired",
                    completedAt: now,
                    updatedAt: now,
                }).where(eq(gameSessions.id, ownedSession.id));
                await tx.insert(gameSessionEvents).values({
                    sessionId: ownedSession.id,
                    actionId: input.actionId,
                    sequence: ownedSession.currentStep + ownedSession.mistakeCount + 1,
                    eventType: "timeout",
                    payload: { wordTileToken: null, meaningTileToken: null },
                    outcome: expired,
                });
                return expired;
            }

            if (input.wordTileToken === null || input.meaningTileToken === null) {
                sessionError("invalid_tile");
            }

            const timeLimitSeconds = ownedSession.settings.mode === "timed" ? 60 : null;
            const scoringSnapshot = toWordMatchingSessionSnapshot(snapshot, timeLimitSeconds);
            const resolution = resolveWordMatchingAttempt(
                scoringSnapshot,
                toWordMatchingProgress(ownedSession),
                { wordTileToken: input.wordTileToken, meaningTileToken: input.meaningTileToken },
                now,
            );

            if (!resolution.ok) {
                if (resolution.error === "session_expired") {
                    const expired: WordMatchingActionOutcome = {
                        expired: true,
                        completed: false,
                        timeTakenSeconds: elapsedSeconds(
                            ownedSession.questionStartedAt,
                            ownedSession.deadlineAt ?? now,
                        ),
                        score: ownedSession.score,
                        mistakes: ownedSession.mistakeCount,
                        matchedWordTokens: ownedSession.matchedTokens,
                        matchedMeaningTokens: matchedMeaningTokens(ownedSession.matchedTokens),
                        review: await buildTerminalReview(ownedSession.matchedTokens),
                    };
                    await tx.update(gameSessions).set({ status: "expired", completedAt: now, updatedAt: now }).where(eq(gameSessions.id, ownedSession.id));
                    await tx.insert(gameSessionEvents).values({
                        sessionId: ownedSession.id,
                        actionId: input.actionId,
                        sequence: ownedSession.currentStep + ownedSession.mistakeCount + 1,
                        eventType: "timeout",
                        payload: { wordTileToken: input.wordTileToken, meaningTileToken: input.meaningTileToken },
                        outcome: expired,
                    });
                    return expired;
                }
                sessionError(resolution.error);
            }

            const completedAt = resolution.state.completedAt === null ? null : new Date(resolution.state.completedAt);
            const verifiedScore = resolution.completed
                && isCompetitiveWordMatchingRuleset(
                    scoringSnapshot.pairs.length,
                    scoringSnapshot.timeLimitSeconds,
                    ownedSession.settings.source,
                )
                ? createVerifiedGameScore(scoringSnapshot, resolution.state)
                : null;
            const outcome: WordMatchingActionOutcome = {
                expired: false,
                completed: resolution.completed,
                isCorrect: resolution.isCorrect,
                pointsEarned: resolution.pointsEarned,
                score: resolution.state.score,
                mistakes: resolution.state.mistakes,
                matchedWordTokens: resolution.state.matchedWordTokens,
                matchedMeaningTokens: matchedMeaningTokens(resolution.state.matchedWordTokens),
                timeTakenSeconds: resolution.completed
                    ? Math.max(0, Math.ceil((resolution.occurredAt - ownedSession.questionStartedAt.getTime()) / 1000))
                    : null,
                finalResult: verifiedScore,
                rank: null as number | null,
            };
            if (resolution.completed) {
                outcome.review = await buildTerminalReview(resolution.state.matchedWordTokens);
            }

            await tx.update(gameSessions).set({
                status: resolution.state.status,
                currentStep: resolution.state.currentStep,
                score: resolution.state.score,
                correctCount: resolution.state.currentStep,
                mistakeCount: resolution.state.mistakes,
                matchedTokens: [...resolution.state.matchedWordTokens],
                completedAt,
                updatedAt: now,
            }).where(eq(gameSessions.id, ownedSession.id));

            if (verifiedScore) {
                await tx.insert(gameScores).values({
                    userId: session.user.id,
                    sessionId: ownedSession.id,
                    gameType: verifiedScore.gameType,
                    score: verifiedScore.score,
                    accuracy: verifiedScore.accuracy,
                    maxStreak: verifiedScore.maxStreak,
                    questionCount: verifiedScore.questionCount,
                    timeTaken: verifiedScore.timeTakenSeconds,
                    verified: true,
                });
                outcome.rank = await getVerifiedRank(tx, "word_matching", session.user.id);
            }

            await tx.insert(gameSessionEvents).values({
                sessionId: ownedSession.id,
                actionId: input.actionId,
                sequence: ownedSession.currentStep + ownedSession.mistakeCount + 1,
                eventType: "matching_attempt",
                payload: { wordTileToken: input.wordTileToken, meaningTileToken: input.meaningTileToken },
                outcome,
                isCorrect: resolution.isCorrect,
                pointsEarned: resolution.pointsEarned,
                createdAt: new Date(resolution.occurredAt),
            });

            return outcome;
        })),

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

            // Only session-backed rows are trusted. DISTINCT ON keeps score,
            // accuracy, and streak from the very same best run.
            const result = await db.execute(sql`
                WITH verified_scores AS (
                    SELECT gs.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY gs.user_id
                            ORDER BY gs.score DESC, gs.created_at ASC, gs.id ASC
                        ) AS best_run,
                        COUNT(*) OVER (PARTITION BY gs.user_id) AS games_played
                    FROM game_scores gs
                    WHERE gs.game_type = ${gameType} AND gs.verified = true AND gs.session_id IS NOT NULL
                )
                SELECT
                    vs.user_id,
                    u.name AS user_name,
                    u.image AS user_image,
                    vs.score AS best_score,
                    vs.accuracy AS best_accuracy,
                    vs.max_streak AS best_streak,
                    vs.games_played
                FROM verified_scores vs
                JOIN users u ON vs.user_id = u.id
                WHERE vs.best_run = 1
                ORDER BY vs.score DESC, vs.created_at ASC, vs.id ASC
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

            // Select a coherent best row, not independent maxima from different runs.
            const result = await db.execute(sql`
                WITH verified_scores AS (
                    SELECT gs.*,
                        ROW_NUMBER() OVER (
                            PARTITION BY gs.user_id
                            ORDER BY gs.score DESC, gs.created_at ASC, gs.id ASC
                        ) AS best_run,
                        COUNT(*) OVER (PARTITION BY gs.user_id) AS games_played
                    FROM game_scores gs
                    WHERE gs.game_type = ${gameType} AND gs.verified = true AND gs.session_id IS NOT NULL
                ), ranked_scores AS (
                    SELECT *, RANK() OVER (ORDER BY score DESC, created_at ASC, id ASC) AS rank
                    FROM verified_scores
                    WHERE best_run = 1
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
                    bestScore: Number(row.score),
                    bestAccuracy: Number(row.accuracy),
                    bestStreak: Number(row.max_streak),
                    gamesPlayed: Number(row.games_played),
                },
            };
        }),
});

