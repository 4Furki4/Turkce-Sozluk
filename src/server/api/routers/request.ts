/**
 * Request Router
 * 
 * This router is modularized into handler files for better organization.
 * Handlers are located in ./request-handlers/
 * 
 * Handler groups:
 * - pronunciation.ts: Pronunciation upload and voting
 * - related-items.ts: Related words and phrases
 * - content-edits.ts: Word, meaning, attribute edits
 * - admin.ts: Admin request management
 */
import { requests } from "@/db/schema/requests";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { and, eq, sql, SQL } from "drizzle-orm";
import { z } from "zod";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { TRPCError } from "@trpc/server";
import { verifyRecaptcha } from "@/src/lib/recaptcha";

// Import handler modules
import {
    pronunciationHandlers,
    relatedItemsHandlers,
    contentEditsHandlers,
    adminHandlers
} from "./request-handlers";

export const requestRouter = createTRPCRouter({
    // ============================================
    // Pronunciation handlers
    // ============================================
    ...pronunciationHandlers,

    // ============================================
    // Related items handlers (words/phrases)
    // ============================================
    ...relatedItemsHandlers,

    // ============================================
    // Content edit handlers
    // ============================================
    ...contentEditsHandlers,

    // ============================================
    // Admin handlers
    // ============================================
    ...adminHandlers,

    // ============================================
    // User request management (kept inline)
    // ============================================
    getUserRequests: protectedProcedure
        .input(z.object({
            page: z.number().default(1),
            limit: z.number().default(10),
            entityType: z.enum([
                "words", "meanings", "roots", "related_words",
                "related_phrases",
                "part_of_speechs", "examples", "authors",
                "word_attributes", "meaning_attributes", "pronunciations", "misspellings", "galatimeshur"
            ]).optional(),
            action: z.enum(["create", "update", "delete"]).optional(),
            status: z.enum(["pending", "approved", "rejected"]).optional(),
        }))
        .query(async ({ input, ctx: { db, session: { user } } }) => {
            const { page, limit, entityType, action, status } = input;
            const offset = (page - 1) * limit;

            let whereClause: SQL<unknown> | undefined = eq(requests.userId, user.id);

            if (entityType) {
                whereClause = and(whereClause, eq(requests.entityType, entityType));
            }
            if (action) {
                whereClause = and(whereClause, eq(requests.action, action));
            }
            if (status) {
                whereClause = and(whereClause, eq(requests.status, status));
            }

            const userRequests = await db.select({
                id: requests.id,
                entityType: requests.entityType,
                entityId: requests.entityId,
                action: requests.action,
                newData: requests.newData,
                requestDate: requests.requestDate,
                status: requests.status,
                reason: requests.reason,
                resolvedAt: requests.resolvedAt,
                resolvedBy: requests.resolvedBy,
                moderationReason: requests.moderationReason,
            })
                .from(requests)
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
                requests: userRequests,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            };
        }),

    getUserRequest: protectedProcedure
        .input(z.object({
            requestId: z.number()
        }))
        .query(async ({ input, ctx: { db, session: { user } } }) => {
            const { requestId } = input;

            const requestData = await db.select()
                .from(requests)
                .where(and(
                    eq(requests.id, requestId),
                    eq(requests.userId, user.id)
                ));

            if (!requestData.length) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Request not found"
                });
            }

            const request = requestData[0];

            let entityData = null;
            if (request.entityId) {
                switch (request.entityType) {
                    case "words":
                        entityData = await db.select().from(words).where(eq(words.id, request.entityId));
                        break;
                    case "pronunciations":
                        entityData = await db.select().from(words).where(eq(words.id, request.entityId));
                        break;
                    case "meanings":
                        entityData = await db.select().from(meanings).where(eq(meanings.id, request.entityId));
                        break;
                }
            }

            return {
                request,
                entityData: entityData?.[0] || null
            };
        }),

    cancelRequest: protectedProcedure
        .input(z.object({
            requestId: z.number(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { requestId, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const requestData = await db.select()
                .from(requests)
                .where(and(
                    eq(requests.id, requestId),
                    eq(requests.userId, user.id),
                    eq(requests.status, "pending")
                ));

            if (!requestData.length) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Request not found or cannot be canceled"
                });
            }

            await db.delete(requests)
                .where(eq(requests.id, requestId));

            return { success: true };
        }),

    updateRequest: protectedProcedure
        .input(z.object({
            requestId: z.number(),
            newData: z.record(z.unknown()),
            reason: z.string().optional(),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { requestId, newData, reason, captchaToken } = input;
            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Error.captchaFailed',
                });
            }

            const requestData = await db.select()
                .from(requests)
                .where(and(
                    eq(requests.id, requestId),
                    eq(requests.userId, user.id),
                    eq(requests.status, "pending")
                ));

            if (!requestData.length) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Request not found or cannot be updated"
                });
            }

            await db.update(requests)
                .set({
                    newData: JSON.stringify(newData),
                    reason: reason || requestData[0].reason
                })
                .where(eq(requests.id, requestId));

            return { success: true };
        }),
});