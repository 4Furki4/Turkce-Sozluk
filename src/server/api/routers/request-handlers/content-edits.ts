/**
 * Content edit request handlers (words, meanings, attributes, authors)
 * Separated from main request router for better organization
 */
import { requests } from "@/db/schema/requests";
import { protectedProcedure } from "../../trpc";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { verifyRecaptcha } from "@/src/lib/recaptcha";
import { purifyObject } from "@/src/lib/utils";
import { wordAttributes } from "@/db/schema/word_attributes";
import { meaningAttributes } from "@/db/schema/meaning_attributes";
import { authors } from "@/db/schema/authors";
import { CreateWordRequestSchema } from "../../schemas/requests";

export const contentEditsHandlers = {
    // Attribute lookups with pending requests
    getWordAttributesWithRequested: protectedProcedure.query(async ({ ctx: { db, session: { user } } }) => {
        const approvedAttributes = await db.select({
            id: wordAttributes.id,
            attribute: wordAttributes.attribute
        }).from(wordAttributes)
            .orderBy(wordAttributes.attribute);

        const pendingRequests = await db.select({
            id: requests.id,
            newData: requests.newData,
            status: requests.status
        }).from(requests)
            .where(and(
                eq(requests.userId, user.id),
                eq(requests.entityType, "word_attributes"),
                eq(requests.action, "create"),
                eq(requests.status, "pending")
            ));

        const requestedAttributes = pendingRequests.map(req => ({
            id: -req.id,
            attribute: (req.newData as { attribute: string }).attribute,
        }));

        const combined = [...approvedAttributes, ...requestedAttributes];
        return combined.sort((a, b) => a.attribute.localeCompare(b.attribute));
    }),

    getMeaningAttributesWithRequested: protectedProcedure.query(async ({ ctx: { db, session: { user } } }) => {
        const approvedAttributes = await db.select({
            id: meaningAttributes.id,
            attribute: meaningAttributes.attribute
        }).from(meaningAttributes)
            .orderBy(meaningAttributes.attribute);

        const pendingRequests = await db.select({
            id: requests.id,
            newData: requests.newData,
            status: requests.status
        }).from(requests)
            .where(and(
                eq(requests.userId, user.id),
                eq(requests.entityType, "meaning_attributes"),
                eq(requests.action, "create"),
                eq(requests.status, "pending")
            ));

        const requestedAttributes = pendingRequests.map(req => ({
            id: -req.id,
            attribute: (req.newData as { attribute: string }).attribute
        }));

        const combined = [...approvedAttributes, ...requestedAttributes];
        return combined.sort((a, b) => a.attribute.localeCompare(b.attribute));
    }),

    getAuthorsWithRequested: protectedProcedure.query(async ({ ctx: { db, session: { user } } }) => {
        const approvedAuthors = await db.select({
            id: authors.id,
            name: authors.name
        }).from(authors)
            .orderBy(authors.name);

        const pendingRequests = await db.select({
            id: requests.id,
            newData: requests.newData,
            status: requests.status
        }).from(requests)
            .where(and(
                eq(requests.userId, user.id),
                eq(requests.entityType, "authors"),
                eq(requests.action, "create"),
                eq(requests.status, "pending")
            ));

        const requestedAuthors = pendingRequests.map(req => ({
            id: -req.id,
            name: (req.newData as { name: string }).name
        }));

        const combined = [...approvedAuthors, ...requestedAuthors];
        return combined.sort((a, b) => a.name.localeCompare(b.name));
    }),

    // Word requests
    createSimpleWordRequest: protectedProcedure
        .input(z.object({
            wordName: z.string().min(1, "Word name is required").max(100),
            captchaToken: z.string(),
        }))
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { wordName, captchaToken } = input;

            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'captchaFailed',
                });
            }

            const existingRequest = await db.select()
                .from(requests)
                .where(and(
                    eq(requests.userId, user.id),
                    eq(requests.entityType, "words"),
                    eq(requests.action, "create"),
                    eq(requests.status, "pending")
                ));

            const duplicateRequest = existingRequest.find(req => {
                try {
                    if (!req.newData || typeof req.newData !== 'string') return false;
                    const newData = JSON.parse(req.newData) as Record<string, any>;
                    return newData.name === wordName.trim();
                } catch {
                    return false;
                }
            });

            if (duplicateRequest) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'wordAlreadyRequested',
                });
            }

            const requestData = {
                name: wordName.trim(),
                requestType: 'simple'
            };

            await db.insert(requests).values({
                entityType: "words",
                action: "create",
                userId: user.id,
                entityId: null,
                newData: JSON.stringify(requestData),
                reason: `Simple word request for: ${wordName.trim()}`
            });

            return { success: true };
        }),

    createFullWordRequest: protectedProcedure
        .input(CreateWordRequestSchema)
        .mutation(async ({ input, ctx: { db, session: { user } } }) => {
            const { captchaToken, relatedWords, relatedPhrases, ...wordData } = input;

            const { success } = await verifyRecaptcha(captchaToken);
            if (!success) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'captchaFailed',
                });
            }

            const existingRequest = await db.select()
                .from(requests)
                .where(and(
                    eq(requests.userId, user.id),
                    eq(requests.entityType, "words"),
                    eq(requests.action, "create"),
                    eq(requests.status, "pending")
                ));

            const duplicateRequest = existingRequest.find(req => {
                try {
                    if (!req.newData || typeof req.newData !== 'string') return false;
                    const newData = JSON.parse(req.newData) as Record<string, any>;
                    return newData.name === wordData.name.trim();
                } catch {
                    return false;
                }
            });

            if (duplicateRequest) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'wordAlreadyRequested',
                });
            }

            const requestData = {
                ...wordData,
                name: wordData.name.trim(),
                requestType: 'full',
                relatedWords: relatedWords || [],
                relatedPhrases: relatedPhrases || [],
            };

            await db.insert(requests).values({
                entityType: "words",
                action: "create",
                userId: user.id,
                entityId: null,
                newData: JSON.stringify(requestData),
                reason: `Full word contribution for: ${wordData.name.trim()}`
            });

            return { success: true };
        }),

    requestEditWord: protectedProcedure.input(z.object({
        word_id: z.number(),
        wordName: z.string().optional(),
        language: z.string().optional(),
        phonetic: z.string().optional(),
        root: z.string().optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        attributes: z.array(z.string()).optional(),
        reason: z.string().min(1, "Reason is required"),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const wordAttributeIds = input.attributes?.map((attribute) => Number(attribute));
        const { word_id, captchaToken, ...restInput } = input;
        const wordData = {
            attributes: wordAttributeIds,
            ...restInput
        };
        const preparedData = Object.keys(wordData).reduce<Record<string, unknown>>((acc, key) => {
            if (wordData[key as keyof typeof wordData]) {
                acc[key] = wordData[key as keyof typeof wordData];
            }
            return acc;
        }, {});
        const purifiedData = purifyObject(preparedData);

        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "words",
                action: "update",
                userId: user.id,
                entityId: input.word_id,
                newData: JSON.stringify(purifiedData),
                reason: input.reason
            });
        });
    }),

    requestEditMeaning: protectedProcedure.input(z.object({
        meaning_id: z.number(),
        meaning: z.string().optional(),
        part_of_speech_id: z.number().optional(),
        sentence: z.string().optional(),
        attributes: z.array(z.number()).optional(),
        author_id: z.number().optional(),
        reason: z.string().min(1, "Reason is required"),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const { meaning_id, reason, captchaToken, attributes, ...restInput } = input;
        const preparedData = Object.keys(restInput).reduce<Record<string, unknown>>((acc, key) => {
            if (restInput[key as keyof typeof restInput]) {
                acc[key] = restInput[key as keyof typeof restInput];
            }
            return acc;
        }, {});
        const purifiedData = purifyObject(preparedData);
        if (attributes) {
            purifiedData.attributes = attributes.map(Number);
        }

        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "meanings",
                action: "update",
                userId: user.id,
                entityId: meaning_id,
                newData: JSON.stringify(purifiedData),
                reason
            });
        });
    }),

    requestDeleteMeaning: protectedProcedure.input(z.object({
        meaning_id: z.number(),
        reason: z.string().min(1, "Reason is required"),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const { meaning_id, reason, captchaToken } = input;
        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "meanings",
                action: "delete",
                userId: user.id,
                entityId: input.meaning_id,
                reason: input.reason
            });
        });
    }),

    newWordAttribute: protectedProcedure.input(z.object({
        attribute: z.string().min(2),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const { attribute, captchaToken } = input;
        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "word_attributes",
                action: "create",
                userId: user.id,
                newData: { attribute },
            });
        });
    }),

    newMeaningAttribute: protectedProcedure.input(z.object({
        attribute: z.string().min(2),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const { attribute, captchaToken } = input;
        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "meaning_attributes",
                action: "create",
                userId: user.id,
                newData: { attribute },
            });
        });
    }),

    newAuthor: protectedProcedure.input(z.object({
        name: z.string().min(2),
        captchaToken: z.string(),
    })).mutation(async ({ input, ctx: { db, session: { user } } }) => {
        const { name, captchaToken } = input;
        try {
            const { success } = await verifyRecaptcha(captchaToken);
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Error.captchaFailed',
            });
        }

        await db.transaction(async (tx) => {
            await tx.insert(requests).values({
                entityType: "authors",
                action: "create",
                userId: user.id,
                newData: { name },
            });
        });
    }),
};
