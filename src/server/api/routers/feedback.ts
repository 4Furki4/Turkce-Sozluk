import { z } from "zod";
import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/src/server/api/trpc";
import { and, desc, eq, sql, asc, or, ilike, notInArray, gte, lte } from "drizzle-orm";
import { feedbacks, feedbackTypeEnum, feedbackStatusEnum } from "@/db/schema/feedbacks";
import { feedbackVotes } from "@/db/schema/feedback_votes";
import { users } from "@/db/schema/users"; // Import the users schema
import { verifyRecaptcha } from "@/src/lib/recaptcha";
import { TRPCError } from "@trpc/server";

export const feedbackRouter = createTRPCRouter({
    /**
     * Creates a new feedback submission. Only authenticated users can perform this action.
     */
    create: protectedProcedure
        .input(
            z.object({
                title: z.string().min(5, "Error.titleMinLength"),
                description: z.string().min(10, "Error.descriptionMinLength"),
                type: z.enum(feedbackTypeEnum.enumValues),
                captchaToken: z.string(),
            })
        )
        .mutation(async ({ ctx: { db, session }, input }) => {
            const { captchaToken, ...feedbackData } = input;

            // Verify the token before proceeding
            const { success, score } = await verifyRecaptcha(captchaToken);
            console.log(success, score);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            // If verification is successful, create the feedback
            await db.insert(feedbacks).values({
                ...feedbackData,
                userId: session.user.id,
            });
        }),

    /**
     * Toggles a vote on a feedback item for the logged-in user.
     */
    vote: protectedProcedure
        .input(z.object({
            feedbackId: z.number(),
            voteType: z.enum(['up', 'down'])
        }))
        .mutation(async ({ ctx: { db, session }, input }) => {
            const { feedbackId, voteType } = input;
            const { id: userId } = session.user;
            const voteValue = voteType === 'up' ? 1 : -1;

            const existingVote = await db.query.feedbackVotes.findFirst({
                where: and(
                    eq(feedbackVotes.userId, userId),
                    eq(feedbackVotes.feedbackId, feedbackId)
                ),
            });

            if (existingVote) {
                if (existingVote.voteType === voteValue) {
                    // Toggle off if clicking same vote type
                    await db
                        .delete(feedbackVotes)
                        .where(eq(feedbackVotes.id, existingVote.id));
                    return { voted: false, voteType: null };
                } else {
                    // Change vote type
                    await db
                        .update(feedbackVotes)
                        .set({ voteType: voteValue })
                        .where(eq(feedbackVotes.id, existingVote.id));
                    return { voted: true, voteType: voteValue };
                }
            } else {
                // New vote
                await db.insert(feedbackVotes).values({
                    feedbackId,
                    userId,
                    voteType: voteValue
                });
                return { voted: true, voteType: voteValue };
            }
        }),

    /**
     * Lists all feedback submissions, ordered by the most recent.
     * Includes vote counts and indicates if the current user has voted.
     * Supports filtering and sorting.
     */
    list: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).nullish(),
                cursor: z.number().nullish(),
                type: z.array(z.enum(feedbackTypeEnum.enumValues)).optional(),
                status: z.array(z.enum(feedbackStatusEnum.enumValues)).optional(),
                searchTerm: z.string().optional(),
                sortBy: z.enum(["votes", "createdAt"]).default("votes"),
                sortOrder: z.enum(["asc", "desc"]).default("desc"),
                excludeStatuses: z.array(z.enum(feedbackStatusEnum.enumValues)).default([
                    "closed", "rejected", "duplicate", "fixed", "wont_implement"
                ]),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            })
        )
        .query(async ({ ctx: { db, session }, input }) => {
            const limit = input.limit ?? 10;
            const { cursor, type, status, searchTerm, sortBy, sortOrder, excludeStatuses, startDate, endDate } = input;
            const userId = session?.user?.id;

            // Build where conditions
            const whereConditions = and(
                // Apply status filters
                status && status.length > 0
                    ? or(...status.map(s => eq(feedbacks.status, s)))
                    : excludeStatuses.length > 0
                        ? notInArray(feedbacks.status, excludeStatuses)
                        : undefined,
                // Apply type filters
                type && type.length > 0
                    ? or(...type.map(t => eq(feedbacks.type, t)))
                    : undefined,
                // Apply search term
                searchTerm
                    ? or(
                        ilike(feedbacks.title, `%${searchTerm}%`),
                        ilike(feedbacks.description, `%${searchTerm}%`)
                    )
                    : undefined,
                // Apply date range filters
                startDate ? gte(feedbacks.createdAt, startDate) : undefined,
                endDate ? lte(feedbacks.createdAt, endDate) : undefined,
                // Apply cursor for pagination
                cursor ? sql`feedbacks.id < ${cursor}` : undefined,
            );

            const voteCounts = db
                .select({
                    feedbackId: feedbackVotes.feedbackId,
                    count: sql<number>`sum(vote_type)`.as("count"),
                })
                .from(feedbackVotes)
                .groupBy(feedbackVotes.feedbackId)
                .as("vote_counts");

            // Determine sort order
            const orderByClause = sortBy === "votes"
                ? (sortOrder === "desc" ? desc(sql<number>`COALESCE(${voteCounts.count}, 0)`) : asc(sql<number>`COALESCE(${voteCounts.count}, 0)`))
                : (sortOrder === "desc" ? desc(feedbacks.createdAt) : asc(feedbacks.createdAt));

            const items = await db
                .select({
                    feedback: feedbacks,
                    user: {
                        id: users.id,
                        name: users.name,
                        image: users.image,
                    },
                    voteCount: sql<number>`COALESCE(${voteCounts.count}, 0)`,
                    userVote: userId
                        ? sql<number>`(SELECT vote_type FROM feedback_votes WHERE feedback_votes.feedback_id = feedbacks.id AND feedback_votes.user_id = ${userId})`
                        : sql<number>`0`,
                    hasVoted: userId
                        ? sql<boolean>`EXISTS (SELECT 1 FROM feedback_votes WHERE feedback_votes.feedback_id = feedbacks.id AND feedback_votes.user_id = ${userId})`
                        : sql<boolean>`false`,
                })
                .from(feedbacks)
                .leftJoin(voteCounts, eq(feedbacks.id, voteCounts.feedbackId))
                .leftJoin(users, eq(feedbacks.userId, users.id))
                .where(whereConditions)
                .orderBy(orderByClause)
                .limit(limit + 1); // Fetch one extra item to determine if there's a next page

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const lastItem = items.pop();
                nextCursor = lastItem!.feedback.id;
            }

            return {
                items,
                nextCursor,
            };
        }),
});
