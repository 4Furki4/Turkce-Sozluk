/**
 * Admin request management handlers
 * Separated from main request router for better organization
 */
import { requests } from "@/db/schema/requests";
import { adminProcedure } from "../../trpc";
import { and, eq, sql, notInArray } from "drizzle-orm";
import { z } from "zod";
import { SQL } from "drizzle-orm";
import { users } from "@/db/schema/users";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { TRPCError } from "@trpc/server";
import { getHandler } from "../../handlers/request-handlers/registry";
import { contributionLogs } from "@/db/schema/contribution_logs";
import { badges, usersToBadges } from "@/db/schema/gamification";
import { getPointsForRequest } from "@/src/lib/gamification-rules";

export const adminHandlers = {
    getAllPendingRequests: adminProcedure
        .input(z.object({
            page: z.number().default(1),
            limit: z.number().default(10),
            entityType: z.enum([
                "words", "meanings", "roots", "related_words",
                "related_phrases",
                "part_of_speechs", "examples", "authors",
                "word_attributes", "meaning_attributes", "pronunciations",
                "misspellings", "galatimeshur"
            ]).optional(),
            action: z.enum(["create", "update", "delete"]).optional()
        }))
        .query(async ({ input, ctx: { db } }) => {
            const { page, limit, entityType, action } = input;
            const offset = (page - 1) * limit;

            let whereClause: SQL<unknown> | undefined = eq(requests.status, "pending");
            if (entityType) {
                whereClause = and(whereClause, eq(requests.entityType, entityType));
            }
            if (action) {
                whereClause = and(whereClause, eq(requests.action, action));
            }

            const pendingRequests = await db.select({
                id: requests.id,
                userId: requests.userId,
                userName: users.name,
                userImage: users.image,
                entityType: requests.entityType,
                requestableId: requests.entityId,
                action: requests.action,
                newData: requests.newData,
                requestDate: requests.requestDate,
                status: requests.status,
                reason: requests.reason
            })
                .from(requests)
                .leftJoin(users, eq(requests.userId, users.id))
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(sql`${requests.requestDate} DESC`);

            const countResult = await db.select({
                count: sql<number>`count(*)`
            })
                .from(requests)
                .where(whereClause);

            const totalCount = countResult[0]?.count || 0;
            const totalPages = Math.ceil(totalCount / limit);

            return {
                requests: pendingRequests,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };
        }),

    getRequestDetails: adminProcedure
        .input(z.object({
            requestId: z.number()
        }))
        .query(async ({ input, ctx: { db } }) => {
            const { requestId } = input;

            const requestData = await db.select()
                .from(requests)
                .where(eq(requests.id, requestId))
                .leftJoin(users, eq(requests.userId, users.id));

            if (!requestData.length) {
                throw new Error("Request not found");
            }

            const request = requestData[0].requests;
            const user = requestData[0].users;

            let entityData = null;
            if (!request.entityId) {
                return {
                    request,
                    user,
                    entityData: null
                };
            }

            switch (request.entityType) {
                case "words":
                    entityData = await db.select().from(words).where(eq(words.id, request.entityId));
                    break;
                case "meanings":
                    entityData = await db.select().from(meanings).where(eq(meanings.id, request.entityId));
                    break;
            }

            return {
                request,
                user,
                entityData: entityData?.[0] || null
            };
        }),

    approveRequest: adminProcedure
        .input(z.object({
            requestId: z.number()
        }))
        .mutation(async ({ input, ctx }) => {
            const { requestId } = input;
            const { db, session } = ctx;

            return await db.transaction(async (tx) => {
                const requestData = await tx.select().from(requests).where(eq(requests.id, requestId));

                if (!requestData.length) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Request not found"
                    });
                }

                const request = requestData[0];

                const handler = getHandler(request.entityType, request.action);
                if (!handler) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Unsupported request type"
                    });
                }

                await handler.handle({ tx, request });

                const pointsToAward = getPointsForRequest(request.action, request.entityType);

                if (pointsToAward > 0) {
                    await tx.insert(contributionLogs).values({
                        userId: request.userId,
                        requestId: request.id,
                        points: pointsToAward,
                    });

                    await tx.update(users)
                        .set({
                            points: sql`${users.points} + ${pointsToAward}`
                        })
                        .where(eq(users.id, request.userId));
                }

                const user = await tx.query.users.findFirst({
                    where: eq(users.id, request.userId),
                    with: {
                        badges: true
                    }
                });

                await tx.update(requests)
                    .set({
                        status: "approved",
                        resolvedAt: new Date(),
                        resolvedBy: session?.user.id ?? null,
                        moderationReason: null,
                    })
                    .where(eq(requests.id, requestId));

                if (user) {
                    const ownedBadgeSlugs = user.badges.map(b => b.badgeSlug);
                    const availableBadges = await tx.query.badges.findMany({
                        where: ownedBadgeSlugs.length > 0 ? notInArray(badges.slug, ownedBadgeSlugs) : undefined
                    });

                    const newBadges: typeof badges.$inferSelect[] = [];

                    const wordCountRes = await tx.select({ count: sql<number>`count(*)` })
                        .from(requests)
                        .where(and(
                            eq(requests.userId, request.userId),
                            eq(requests.entityType, "words"),
                            eq(requests.action, "create"),
                            eq(requests.status, "approved")
                        ));
                    const totalWords = wordCountRes[0]?.count || 0;

                    const pronunciationCountRes = await tx.select({ count: sql<number>`count(*)` })
                        .from(requests)
                        .where(and(
                            eq(requests.userId, request.userId),
                            eq(requests.entityType, "pronunciations"),
                            eq(requests.action, "create"),
                            eq(requests.status, "approved")
                        ));
                    const totalPronunciations = pronunciationCountRes[0]?.count || 0;

                    for (const badge of availableBadges) {
                        let earned = false;
                        switch (badge.requirementType) {
                            case "min_points":
                                if (user.points >= badge.requirementValue) earned = true;
                                break;
                            case "count_word":
                                if (totalWords >= badge.requirementValue) earned = true;
                                break;
                            case "count_pronunciation":
                                if (totalPronunciations >= badge.requirementValue) earned = true;
                                break;
                        }

                        if (earned) {
                            await tx.insert(usersToBadges).values({
                                userId: request.userId,
                                badgeSlug: badge.slug,
                            });
                            newBadges.push(badge);
                        }
                    }

                    return { success: true, newBadges };
                }

                return { success: true };
            });
        }),

    rejectRequest: adminProcedure
        .input(z.object({
            requestId: z.number(),
            reason: z.string().optional()
        }))
        .mutation(async ({ input, ctx }) => {
            const { requestId, reason } = input;
            const { db, session } = ctx;

            await db.update(requests)
                .set({
                    status: "rejected",
                    reason: reason ? `Rejected: ${reason}` : undefined,
                    resolvedAt: new Date(),
                    resolvedBy: session?.user.id ?? null,
                    moderationReason: reason ?? null,
                })
                .where(eq(requests.id, requestId));

            return { success: true };
        }),
};
