/**
 * Pronunciation request handlers
 * Separated from main request router for better organization
 */
import { requests } from "@/db/schema/requests";
import { protectedProcedure, publicProcedure } from "../../trpc";
import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { request_votes } from "@/db/schema/request_votes";

export const pronunciationHandlers = {
    createPronunciationRequest: protectedProcedure
        .input(z.object({
            word_id: z.number(),
            audio_url: z.string().url(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.insert(requests).values({
                entityType: "pronunciations",
                action: "create",
                userId: ctx.session.user.id,
                newData: {
                    audio_url: input.audio_url,
                },
                reason: input.reason,
                entityId: input.word_id,
            });
        }),

    getVotablePronunciationRequests: publicProcedure
        .input(z.object({
            search: z.string().optional(),
            sortBy: z.enum(['createdAt', 'voteCount']).default('createdAt'),
            sortOrder: z.enum(['asc', 'desc']).default('desc'),
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(50).default(10),
        }))
        .query(async ({ ctx, input }) => {
            const { search, sortBy, sortOrder, page, limit } = input;
            const offset = (page - 1) * limit;

            const whereClause = and(
                eq(requests.status, "pending"),
                eq(requests.entityType, "pronunciations"),
                search ? ilike(words.name, `%${search}%`) : undefined
            );

            const totalCountResult = await ctx.db
                .select({ count: sql<number>`count(*)` })
                .from(requests)
                .leftJoin(words, eq(requests.entityId, words.id))
                .where(whereClause);

            const totalCount = totalCountResult[0]?.count || 0;

            const pendingRequests = await ctx.db
                .select({
                    request: requests,
                    user: {
                        id: users.id,
                        name: users.name,
                        image: users.image,
                    },
                    word: {
                        id: words.id,
                        name: words.name,
                    },
                    voteCount: sql<number>`sum(${request_votes.vote_type})`.as("voteCount"),
                    hasVoted: ctx.session?.user ? sql<boolean>`EXISTS(SELECT 1 FROM ${request_votes} WHERE ${request_votes.request_id} = ${requests.id} AND ${request_votes.user_id} = ${ctx.session.user.id})`.as("hasVoted") : sql<boolean>`false`.as("hasVoted"),
                    userVote: ctx.session?.user ? sql<number>`(SELECT vote_type FROM ${request_votes} WHERE ${request_votes.request_id} = ${requests.id} AND ${request_votes.user_id} = ${ctx.session.user.id})`.as("userVote") : sql<number>`0`.as("userVote"),
                })
                .from(requests)
                .where(whereClause)
                .leftJoin(users, eq(requests.userId, users.id))
                .leftJoin(words, eq(requests.entityId, words.id))
                .leftJoin(request_votes, eq(requests.id, request_votes.request_id))
                .groupBy(requests.id, users.id, words.id)
                .orderBy(sortBy === 'voteCount'
                    ? sql`"voteCount" ${sql.raw(sortOrder)}`
                    : sql`${requests.requestDate} ${sql.raw(sortOrder)}`)
                .limit(limit)
                .offset(offset);

            return {
                requests: pendingRequests,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            };
        }),
};
