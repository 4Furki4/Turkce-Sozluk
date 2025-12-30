import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
    adminProcedure,
} from "@/src/server/api/trpc";
import { and, desc, eq, sql, asc, or, ilike } from "drizzle-orm";
import {
    foreignTermSuggestions,
    suggestionStatusEnum,
} from "@/db/schema/foreign_term_suggestions";
import { foreignTermSuggestionVotes } from "@/db/schema/foreign_term_suggestion_votes";
import { users } from "@/db/schema/users";
import { languages } from "@/db/schema/languages";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { wordSources } from "@/db/schema/word_sources";
import { TRPCError } from "@trpc/server";

export const foreignTermSuggestionRouter = createTRPCRouter({
    /**
     * Get list of languages for the dropdown
     */
    getLanguages: publicProcedure.query(async ({ ctx: { db } }) => {
        return await db.select().from(languages).orderBy(languages.language_tr);
    }),

    /**
     * Creates a new foreign term suggestion. Only authenticated users can perform this action.
     */
    create: protectedProcedure
        .input(
            z.object({
                foreignTerm: z.string().min(1, "Error.foreignTermRequired"),
                languageId: z.number().min(1, "Error.languageRequired"),
                foreignMeaning: z.string().min(1, "Error.meaningRequired"),
                suggestedTurkishWord: z.string().min(1, "Error.turkishWordRequired"),
                isNewWord: z.boolean().default(true),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ ctx: { db, session }, input }) => {
            const [result] = await db
                .insert(foreignTermSuggestions)
                .values({
                    userId: session.user.id,
                    foreignTerm: input.foreignTerm,
                    languageId: input.languageId,
                    foreignMeaning: input.foreignMeaning,
                    suggestedTurkishWord: input.suggestedTurkishWord,
                    isNewWord: input.isNewWord,
                    reason: input.reason,
                })
                .returning({ id: foreignTermSuggestions.id });

            return { id: result.id };
        }),

    /**
     * Get a single suggestion by ID
     */
    getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx: { db, session }, input }) => {
            const userId = session?.user?.id;

            const voteCounts = db
                .select({
                    suggestionId: foreignTermSuggestionVotes.suggestionId,
                    count: sql<number>`sum(vote_type)`.as("count"),
                })
                .from(foreignTermSuggestionVotes)
                .groupBy(foreignTermSuggestionVotes.suggestionId)
                .as("vote_counts");

            const [result] = await db
                .select({
                    suggestion: foreignTermSuggestions,
                    user: {
                        id: users.id,
                        name: users.name,
                        image: users.image,
                    },
                    language: {
                        id: languages.id,
                        language_en: languages.language_en,
                        language_tr: languages.language_tr,
                        language_code: languages.language_code,
                    },
                    voteCount: sql<number>`COALESCE(${voteCounts.count}, 0)`,
                    userVote: userId
                        ? sql<number>`(SELECT vote_type FROM foreign_term_suggestion_votes WHERE suggestion_id = ${foreignTermSuggestions.id} AND user_id = ${userId})`
                        : sql<number>`0`,
                    hasVoted: userId
                        ? sql<boolean>`EXISTS (SELECT 1 FROM foreign_term_suggestion_votes WHERE suggestion_id = ${foreignTermSuggestions.id} AND user_id = ${userId})`
                        : sql<boolean>`false`,
                })
                .from(foreignTermSuggestions)
                .leftJoin(voteCounts, eq(foreignTermSuggestions.id, voteCounts.suggestionId))
                .leftJoin(users, eq(foreignTermSuggestions.userId, users.id))
                .leftJoin(languages, eq(foreignTermSuggestions.languageId, languages.id))
                .where(eq(foreignTermSuggestions.id, input.id));

            if (!result) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "suggestionNotFound",
                });
            }

            return result;
        }),

    /**
     * Lists all suggestions with vote counts. Supports filtering and sorting.
     */
    list: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.number().nullish(),
                status: z.array(z.enum(suggestionStatusEnum.enumValues)).optional(),
                searchTerm: z.string().optional(),
                sortBy: z.enum(["votes", "createdAt"]).default("votes"),
                sortOrder: z.enum(["asc", "desc"]).default("desc"),
                languageId: z.number().optional(),
            })
        )
        .query(async ({ ctx: { db, session }, input }) => {
            const { limit, cursor, status, searchTerm, sortBy, sortOrder, languageId } = input;
            const userId = session?.user?.id;

            // Build where conditions
            const whereConditions = and(
                // Apply status filters
                status && status.length > 0
                    ? or(...status.map((s) => eq(foreignTermSuggestions.status, s)))
                    : undefined,
                // Apply language filter
                languageId ? eq(foreignTermSuggestions.languageId, languageId) : undefined,
                // Apply search term
                searchTerm
                    ? or(
                        ilike(foreignTermSuggestions.foreignTerm, `%${searchTerm}%`),
                        ilike(foreignTermSuggestions.suggestedTurkishWord, `%${searchTerm}%`),
                        ilike(foreignTermSuggestions.foreignMeaning, `%${searchTerm}%`)
                    )
                    : undefined,
                // Apply cursor for pagination
                cursor ? sql`${foreignTermSuggestions.id} < ${cursor}` : undefined
            );

            const voteCounts = db
                .select({
                    suggestionId: foreignTermSuggestionVotes.suggestionId,
                    count: sql<number>`sum(vote_type)`.as("count"),
                })
                .from(foreignTermSuggestionVotes)
                .groupBy(foreignTermSuggestionVotes.suggestionId)
                .as("vote_counts");

            // Determine sort order
            const orderByClause =
                sortBy === "votes"
                    ? sortOrder === "desc"
                        ? desc(sql<number>`COALESCE(${voteCounts.count}, 0)`)
                        : asc(sql<number>`COALESCE(${voteCounts.count}, 0)`)
                    : sortOrder === "desc"
                        ? desc(foreignTermSuggestions.createdAt)
                        : asc(foreignTermSuggestions.createdAt);

            const items = await db
                .select({
                    suggestion: foreignTermSuggestions,
                    user: {
                        id: users.id,
                        name: users.name,
                        image: users.image,
                    },
                    language: {
                        id: languages.id,
                        language_en: languages.language_en,
                        language_tr: languages.language_tr,
                        language_code: languages.language_code,
                    },
                    voteCount: sql<number>`COALESCE(${voteCounts.count}, 0)`,
                    userVote: userId
                        ? sql<number>`(SELECT vote_type FROM foreign_term_suggestion_votes WHERE suggestion_id = ${foreignTermSuggestions.id} AND user_id = ${userId})`
                        : sql<number>`0`,
                    hasVoted: userId
                        ? sql<boolean>`EXISTS (SELECT 1 FROM foreign_term_suggestion_votes WHERE suggestion_id = ${foreignTermSuggestions.id} AND user_id = ${userId})`
                        : sql<boolean>`false`,
                })
                .from(foreignTermSuggestions)
                .leftJoin(voteCounts, eq(foreignTermSuggestions.id, voteCounts.suggestionId))
                .leftJoin(users, eq(foreignTermSuggestions.userId, users.id))
                .leftJoin(languages, eq(foreignTermSuggestions.languageId, languages.id))
                .where(whereConditions)
                .orderBy(orderByClause)
                .limit(limit + 1);

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const lastItem = items.pop();
                nextCursor = lastItem!.suggestion.id;
            }

            return {
                items,
                nextCursor,
            };
        }),

    /**
     * Vote on a suggestion (upvote/downvote toggle)
     */
    vote: protectedProcedure
        .input(
            z.object({
                suggestionId: z.number(),
                voteType: z.enum(["up", "down"]),
            })
        )
        .mutation(async ({ ctx: { db, session }, input }) => {
            const { suggestionId, voteType } = input;
            const userId = session.user.id;
            const voteValue = voteType === "up" ? 1 : -1;

            const existingVote = await db.query.foreignTermSuggestionVotes.findFirst({
                where: and(
                    eq(foreignTermSuggestionVotes.suggestionId, suggestionId),
                    eq(foreignTermSuggestionVotes.userId, userId)
                ),
            });

            if (existingVote) {
                if (existingVote.voteType === voteValue) {
                    // Toggle off if clicking same vote type
                    await db
                        .delete(foreignTermSuggestionVotes)
                        .where(eq(foreignTermSuggestionVotes.id, existingVote.id));
                    return { voted: false, voteType: null };
                } else {
                    // Change vote type
                    await db
                        .update(foreignTermSuggestionVotes)
                        .set({ voteType: voteValue })
                        .where(eq(foreignTermSuggestionVotes.id, existingVote.id));
                    return { voted: true, voteType: voteValue };
                }
            } else {
                // New vote
                await db.insert(foreignTermSuggestionVotes).values({
                    suggestionId,
                    userId,
                    voteType: voteValue,
                });
                return { voted: true, voteType: voteValue };
            }
        }),

    /**
     * Get user's vote on a specific suggestion
     */
    getUserVote: protectedProcedure
        .input(z.object({ suggestionId: z.number() }))
        .query(async ({ ctx: { db, session }, input }) => {
            const vote = await db.query.foreignTermSuggestionVotes.findFirst({
                where: and(
                    eq(foreignTermSuggestionVotes.suggestionId, input.suggestionId),
                    eq(foreignTermSuggestionVotes.userId, session.user.id)
                ),
            });

            return vote ? { voteType: vote.voteType } : null;
        }),

    /**
     * Admin: Approve a suggestion and create the word entry
     */
    approve: adminProcedure
        .input(
            z.object({
                suggestionId: z.number(),
                moderationReason: z.string().optional(),
                meaningText: z.string().optional(), // Optional override for the meaning
            })
        )
        .mutation(async ({ ctx: { db, session }, input }) => {
            const { suggestionId, moderationReason, meaningText } = input;

            // Get the suggestion
            const suggestion = await db.query.foreignTermSuggestions.findFirst({
                where: eq(foreignTermSuggestions.id, suggestionId),
                with: {
                    language: true,
                },
            });

            if (!suggestion) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "suggestionNotFound",
                });
            }

            if (suggestion.status !== "pending") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "suggestionAlreadyResolved",
                });
            }

            // Create word source for foreign term suggestion
            const [source] = await db
                .insert(wordSources)
                .values({
                    sourceType: "foreign_term_suggestion",
                    sourceDescription: `Foreign term suggestion: "${suggestion.foreignTerm}" (${suggestion.language?.language_tr})`,
                    contributorId: suggestion.userId,
                })
                .returning({ id: wordSources.id });

            // Create the word entry
            const [word] = await db
                .insert(words)
                .values({
                    name: suggestion.suggestedTurkishWord,
                    sourceId: source.id,
                })
                .returning({ id: words.id });

            // Create the meaning
            await db.insert(meanings).values({
                wordId: word.id,
                meaning: meaningText || suggestion.foreignMeaning,
                order: 1,
            });

            // Update the suggestion status
            await db
                .update(foreignTermSuggestions)
                .set({
                    status: "approved",
                    resolvedAt: new Date(),
                    resolvedBy: session.user.id,
                    moderationReason,
                    createdWordId: word.id,
                    updatedAt: new Date(),
                })
                .where(eq(foreignTermSuggestions.id, suggestionId));

            return { wordId: word.id };
        }),

    /**
     * Admin: Reject a suggestion
     */
    reject: adminProcedure
        .input(
            z.object({
                suggestionId: z.number(),
                moderationReason: z.string().min(1, "Error.moderationReasonRequired"),
            })
        )
        .mutation(async ({ ctx: { db, session }, input }) => {
            const { suggestionId, moderationReason } = input;

            // Get the suggestion
            const suggestion = await db.query.foreignTermSuggestions.findFirst({
                where: eq(foreignTermSuggestions.id, suggestionId),
            });

            if (!suggestion) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "suggestionNotFound",
                });
            }

            if (suggestion.status !== "pending") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "suggestionAlreadyResolved",
                });
            }

            // Update the suggestion status
            await db
                .update(foreignTermSuggestions)
                .set({
                    status: "rejected",
                    resolvedAt: new Date(),
                    resolvedBy: session.user.id,
                    moderationReason,
                    updatedAt: new Date(),
                })
                .where(eq(foreignTermSuggestions.id, suggestionId));

            return { success: true };
        }),

    /**
     * Get user's own suggestions
     */
    getMySuggestions: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(10),
                cursor: z.number().nullish(),
                status: z.enum(suggestionStatusEnum.enumValues).optional(),
            })
        )
        .query(async ({ ctx: { db, session }, input }) => {
            const { limit, cursor, status } = input;

            const whereConditions = and(
                eq(foreignTermSuggestions.userId, session.user.id),
                status ? eq(foreignTermSuggestions.status, status) : undefined,
                cursor ? sql`${foreignTermSuggestions.id} < ${cursor}` : undefined
            );

            const items = await db
                .select({
                    suggestion: foreignTermSuggestions,
                    language: {
                        id: languages.id,
                        language_en: languages.language_en,
                        language_tr: languages.language_tr,
                    },
                })
                .from(foreignTermSuggestions)
                .leftJoin(languages, eq(foreignTermSuggestions.languageId, languages.id))
                .where(whereConditions)
                .orderBy(desc(foreignTermSuggestions.createdAt))
                .limit(limit + 1);

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const lastItem = items.pop();
                nextCursor = lastItem!.suggestion.id;
            }

            return {
                items,
                nextCursor,
            };
        }),
});
