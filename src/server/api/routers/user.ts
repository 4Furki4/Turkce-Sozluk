import { count, eq, sql, desc, inArray, ilike, exists } from "drizzle-orm";
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { SavedWordsResult } from "@/types";
import { savedWords } from "@/db/schema/saved_words";
import { savedWordCollections, savedWordCollectionMembers } from "@/db/schema/saved_word_collections";
import { roots } from "@/db/schema/roots";
import { languages } from "@/db/schema/languages";
import { rolesEnum, users } from "@/db/schema/users";
import { TRPCError } from "@trpc/server";
import { userSearchHistory } from "@/db/schema/user_search_history";
import { words } from "@/db/schema/words";
import { and, asc } from "drizzle-orm";
import { meanings } from "@/db/schema/meanings";
import { examples } from "@/db/schema/examples";
import { requests as requestsTable, type EntityTypes } from "@/db/schema/requests";
import { contributionLogs } from "@/db/schema/contribution_logs";
import { badges, usersToBadges } from "@/db/schema/gamification";

export const userRouter = createTRPCRouter({
    /**
     * Get the search history for the currently logged-in user
     */
    getUserSearchHistory: protectedProcedure
        .input(
            z.object({
                limit: z.number().int().positive().optional().default(25)
            })
        )
        .query(async ({ input, ctx: { db, session } }) => {
            const userId = session.user.id;

            try {
                // Query user search history with word details
                const history = await db.select({
                    wordId: userSearchHistory.wordId,
                    wordName: words.name,
                    searchedAt: userSearchHistory.searchedAt
                })
                    .from(userSearchHistory)
                    .innerJoin(words, eq(userSearchHistory.wordId, words.id))
                    .where(eq(userSearchHistory.userId, userId))
                    .orderBy(desc(userSearchHistory.searchedAt))
                    .limit(input.limit);

                return history;
            } catch (error) {
                console.error("Error fetching user search history:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to retrieve search history"
                });
            }
        }),
    getSavedWords: protectedProcedure.input(z.object({
        search: z.string().max(255).optional().default(""),
        sortAlphabet: z.enum(["az", "za"]).default("az"),
        sortDate: z.enum(["dateAsc", "dateDesc"]).default("dateAsc"),
        sortBy: z.enum(["alphabet", "date"]).default("date"),
        take: z.number().int().min(1).max(100).optional().default(10),
        skip: z.number().int().nonnegative().optional().default(0),
        collectionId: z.string().uuid().optional(),
    })).query(async ({ ctx: { session, db }, input }) => {
        const { search, sortAlphabet, sortDate, sortBy, take, skip, collectionId } = input;
        const alphabetOrder = sortAlphabet === "az" ? asc(words.name) : desc(words.name);
        const dateOrder = sortDate === "dateAsc" ? asc(savedWords.createdAt) : desc(savedWords.createdAt);
        const collectionFilter = collectionId ? exists(db.select({ id: savedWordCollectionMembers.wordId })
            .from(savedWordCollectionMembers)
            .where(and(
                eq(savedWordCollectionMembers.collectionId, collectionId),
                eq(savedWordCollectionMembers.userId, session.user.id),
                eq(savedWordCollectionMembers.wordId, savedWords.wordId),
            ))) : undefined;
        // Correlated projections keep one row per saved word, even when a word
        // has several roots, meanings, attributes, or collection memberships.
        return db.select({
            word_data: sql<SavedWordsResult["word_data"] & { collections: { id: string; name: string }[] }>`json_build_object(
                'word_id', ${words.id},
                'word_name', ${words.name},
                'saved_at', ${savedWords.createdAt},
                'attributes', (SELECT json_agg(json_build_object('attribute_id', wa.id, 'attribute', wa.attribute))
                    FROM words_attributes wsa JOIN word_attributes wa ON wsa.attribute_id = wa.id WHERE wsa.word_id = ${words.id}),
                'root', COALESCE((SELECT json_build_object('root', ${roots.root}, 'language', ${languages.language_en})
                    FROM ${roots} LEFT JOIN ${languages} ON ${roots.languageId} = ${languages.id}
                    WHERE ${roots.wordId} = ${words.id} ORDER BY ${roots.id} LIMIT 1), '{"root":null,"language":null}'::json),
                'meaning', (SELECT meaning FROM ${meanings} WHERE ${meanings.wordId} = ${words.id} ORDER BY ${meanings.order}, ${meanings.id} LIMIT 1),
                'collections', COALESCE((SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.name, c.id)
                    FROM saved_word_collection_members cm JOIN saved_word_collections c ON c.id = cm.collection_id AND c.user_id = cm.user_id
                    WHERE cm.user_id = ${session.user.id} AND cm.word_id = ${words.id}), '[]'::json)
            )`,
        }).from(savedWords).innerJoin(words, eq(savedWords.wordId, words.id))
            .where(and(eq(savedWords.userId, session.user.id), search ? ilike(words.name, `%${search}%`) : undefined, collectionFilter))
            .orderBy(...(sortBy === "alphabet" ? [alphabetOrder, dateOrder] : [dateOrder, alphabetOrder]), asc(words.id))
            .limit(take).offset(skip);
    }),
    getSavedWordCount: protectedProcedure.input(z.object({
        search: z.string().max(255).optional().default(""),
        collectionId: z.string().uuid().optional(),
    })).query(async ({ ctx: { session, db }, input: { search, collectionId } }) => {
        const collectionFilter = collectionId ? exists(db.select({ id: savedWordCollectionMembers.wordId })
            .from(savedWordCollectionMembers).where(and(
                eq(savedWordCollectionMembers.collectionId, collectionId),
                eq(savedWordCollectionMembers.userId, session.user.id),
                eq(savedWordCollectionMembers.wordId, savedWords.wordId),
            ))) : undefined;
        const [result] = await db.select({ count: count() }).from(savedWords)
            .innerJoin(words, eq(savedWords.wordId, words.id))
            .where(and(eq(savedWords.userId, session.user.id), search ? ilike(words.name, `%${search}%`) : undefined, collectionFilter));
        return result?.count ?? 0;
    }),
    getSavedWordCollections: protectedProcedure.query(async ({ ctx: { session, db } }) => {
        return db.select({ id: savedWordCollections.id, name: savedWordCollections.name, wordCount: count(savedWordCollectionMembers.wordId) })
            .from(savedWordCollections)
            .leftJoin(savedWordCollectionMembers, and(
                eq(savedWordCollectionMembers.collectionId, savedWordCollections.id),
                eq(savedWordCollectionMembers.userId, session.user.id),
            ))
            .where(eq(savedWordCollections.userId, session.user.id))
            .groupBy(savedWordCollections.id)
            .orderBy(asc(savedWordCollections.name), asc(savedWordCollections.id));
    }),
    createSavedWordCollection: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(80) }))
        .mutation(async ({ ctx: { session, db }, input }) => {
            const [collection] = await db.insert(savedWordCollections).values({ userId: session.user.id, name: input.name })
                .onConflictDoNothing().returning({ id: savedWordCollections.id, name: savedWordCollections.name });
            if (!collection) throw new TRPCError({ code: "CONFLICT", message: "A collection with this name already exists." });
            return collection;
        }),
    renameSavedWordCollection: protectedProcedure.input(z.object({ collectionId: z.string().uuid(), name: z.string().trim().min(1).max(80) }))
        .mutation(async ({ ctx: { session, db }, input }) => {
            try {
                const [collection] = await db.update(savedWordCollections).set({ name: input.name })
                    .where(and(eq(savedWordCollections.id, input.collectionId), eq(savedWordCollections.userId, session.user.id)))
                    .returning({ id: savedWordCollections.id, name: savedWordCollections.name });
                if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found." });
                return collection;
            } catch (error) {
                if (error && typeof error === "object" && ("code" in error && error.code === "23505" || "cause" in error && typeof error.cause === "object" && error.cause && "code" in error.cause && error.cause.code === "23505")) {
                    throw new TRPCError({ code: "CONFLICT", message: "A collection with this name already exists." });
                }
                throw error;
            }
        }),
    deleteSavedWordCollection: protectedProcedure.input(z.object({ collectionId: z.string().uuid() }))
        .mutation(async ({ ctx: { session, db }, input }) => {
            const removed = await db.delete(savedWordCollections)
                .where(and(eq(savedWordCollections.id, input.collectionId), eq(savedWordCollections.userId, session.user.id)))
                .returning({ id: savedWordCollections.id });
            if (!removed.length) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found." });
            return { success: true };
        }),
    updateSavedWordCollection: protectedProcedure.input(z.object({
        collectionId: z.string().uuid(),
        wordIds: z.array(z.number().int().positive()).min(1).max(100),
        action: z.enum(["add", "remove"]),
    })).mutation(async ({ ctx: { session, db }, input }) => db.transaction(async (tx) => {
        const [collection] = await tx.select({ id: savedWordCollections.id }).from(savedWordCollections)
            .where(and(eq(savedWordCollections.id, input.collectionId), eq(savedWordCollections.userId, session.user.id)))
            .for("update");
        if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found." });
        const wordIds = [...new Set(input.wordIds)];
        let changed: { wordId: number }[];
        if (input.action === "remove") {
            changed = await tx.delete(savedWordCollectionMembers).where(and(
                eq(savedWordCollectionMembers.collectionId, input.collectionId), eq(savedWordCollectionMembers.userId, session.user.id),
                inArray(savedWordCollectionMembers.wordId, wordIds),
            )).returning({ wordId: savedWordCollectionMembers.wordId });
        } else {
            const ownedWords = await tx.select({ wordId: savedWords.wordId }).from(savedWords)
                .where(and(eq(savedWords.userId, session.user.id), inArray(savedWords.wordId, wordIds))).for("key share");
            if (ownedWords.length !== wordIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Only saved words can be added to a collection." });
            changed = await tx.insert(savedWordCollectionMembers).values(wordIds.map((wordId) => ({ collectionId: input.collectionId, userId: session.user.id, wordId })))
                .onConflictDoNothing().returning({ wordId: savedWordCollectionMembers.wordId });
        }
        return { success: true, wordIds: changed.map((member) => member.wordId) };
    })),
    setWordSaved: protectedProcedure.input(z.object({ wordId: z.number().int().positive(), saved: z.boolean() }))
        .mutation(async ({ ctx: { session, db }, input }) => db.transaction(async (tx) => {
            if (input.saved) {
                await tx.insert(savedWords).values({ userId: session.user.id, wordId: input.wordId }).onConflictDoNothing();
                return { saved: true, snapshot: undefined };
            }
            const [saved] = await tx.select({ savedAt: savedWords.createdAt }).from(savedWords)
                .where(and(eq(savedWords.userId, session.user.id), eq(savedWords.wordId, input.wordId))).for("update");
            if (!saved) return { saved: false, snapshot: undefined };
            const memberships = await tx.select({ collectionId: savedWordCollectionMembers.collectionId }).from(savedWordCollectionMembers)
                .where(and(eq(savedWordCollectionMembers.userId, session.user.id), eq(savedWordCollectionMembers.wordId, input.wordId)));
            await tx.delete(savedWords).where(and(eq(savedWords.userId, session.user.id), eq(savedWords.wordId, input.wordId)));
            return { saved: false, snapshot: { savedAt: saved.savedAt, collectionIds: memberships.map((member) => member.collectionId) } };
        })),
    restoreSavedWord: protectedProcedure.input(z.object({
        wordId: z.number().int().positive(),
        savedAt: z.string().max(64).refine((value) => Number.isFinite(Date.parse(value)), "Invalid saved date."),
        collectionIds: z.array(z.string().uuid()),
    })).mutation(async ({ ctx: { session, db }, input }) => db.transaction(async (tx) => {
        const collectionIds = [...new Set(input.collectionIds)];
        // Lock surviving owned collections so a concurrent deletion cannot race
        // membership restoration. Deleted or foreign collections are ignored.
        const ownedCollections = collectionIds.length ? await tx.select({ id: savedWordCollections.id }).from(savedWordCollections)
            .where(and(eq(savedWordCollections.userId, session.user.id), inArray(savedWordCollections.id, collectionIds))).for("key share") : [];
        await tx.insert(savedWords).values({ userId: session.user.id, wordId: input.wordId, createdAt: input.savedAt }).onConflictDoNothing();
        if (ownedCollections.length) {
            await tx.insert(savedWordCollectionMembers).values(ownedCollections.map(({ id }) => ({ collectionId: id, userId: session.user.id, wordId: input.wordId })))
                .onConflictDoNothing();
        }
        return { saved: true };
    })),
    getWordSaveStatus: protectedProcedure
        .input(z.number())
        .query(async ({ input, ctx: { session, db } }) => {
            const result = await db.execute(
                sql`
        SELECT
          *
        FROM
          saved_words
          WHERE
          user_id = ${session.user.id}
          AND word_id = ${input}
        `
            )
            if (result.length > 0) {
                return true
            }
            return false
        }),
    /**
     * Save a word to user's saved word list
     */
    saveWord: protectedProcedure
        .input(z.object({ wordId: z.number().int().positive() }))
        .mutation(async ({ input, ctx: { session, db } }) => db.transaction(async (tx) => {
            const inserted = await tx.insert(savedWords).values({ userId: session.user.id, wordId: input.wordId })
                .onConflictDoNothing().returning({ wordId: savedWords.wordId });
            if (inserted.length) return true;
            await tx.delete(savedWords).where(and(eq(savedWords.userId, session.user.id), eq(savedWords.wordId, input.wordId)));
            return false;
        })),
    getUsers: adminProcedure.input(
        z.object({
            take: z.number().optional().default(5),
            skip: z.number().optional().default(0),
        })
    ).query(async ({ ctx: { db }, input }) => {
        const users = await db.query.users.findMany({
            limit: input.take,
            offset: input.skip,
            orderBy: (users, { asc }) => [asc(users.id)],
        })
        return users
    }),
    getUserCount: adminProcedure
        .query(async ({ ctx: { db } }) => {
            const result = await db.select({ count: count() }).from(users);
            return result[0].count
        }),
    getUserRole: adminProcedure
        .input(z.object({
            userId: z.string()
        }))
        .query(async ({ ctx: { db }, input: { userId } }) => {
            const result = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    role: true
                }
            })
            return result?.role
        }),
    setRole: adminProcedure.input(z.object({
        selectedRole: z.enum(rolesEnum.enumValues),
        userId: z.string()
    })).mutation(async ({ ctx: { db }, input: { userId, selectedRole } }) => {
        const userExist = await db.query.users.findFirst({
            where: eq(users.id, userId)
        })
        if (!userExist) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No user found to change their role! Please make sure a user is provided and try again. If the error persists, please contact the admins or developers."
            })
        }
        try {
            await db.update(users).set({
                role: selectedRole,
            }).where(eq(users.id, userId))
            return {
                message: "The users role is updated!"
            }
        } catch (error) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "An error occurred while updating the user's role! Please try again. If the error persists, please contact the admins or developers."
            })
        }
    }),
    deleteUser: adminProcedure.input(z.object({
        userId: z.string()
    })).mutation(async ({ ctx: { db }, input: { userId } }) => {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        })
        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No user found to delete! Please make sure a user is provided and try again. If the error persists, please contact the admins or developers."
            })
        }
        await db.delete(users).where(eq(users.id, userId))
        return {
            message: "The user is deleted successfully!"
        }
    }),
    getProfile: publicProcedure
        .input(z.object({
            userId: z.string()
        }))
        .query(async ({ ctx: { db }, input: { userId } }) => {
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    image: true,
                }
            });

            if (!user) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found"
                });
            }

            return user;
        }),

    getPublicProfileData: publicProcedure
        .input(
            z.object({
                userId: z.string(),
            })
        )
        // .output(PublicProfileDataOutput) // Output schema can be added once fully defined and tested
        .query(async ({ ctx, input }) => {
            const { db, session } = ctx;
            const { userId: targetUserId } = input;
            const currentUserId = session?.user?.id;
            const isOwnProfile = currentUserId === targetUserId;

            // 1. Fetch User Basic Info
            const userResult = await db
                .select({
                    id: users.id,
                    name: users.name,
                    username: users.username,
                    image: users.image,
                    createdAt: users.createdAt,
                    ...(isOwnProfile && { email: users.email }),
                })
                .from(users)
                .where(eq(users.id, targetUserId))
                .limit(1);

            const userProfile = userResult[0];

            if (!userProfile) {
                throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
            }

            // 2. Fetch Contribution Statistics
            const approvedRequestsStatsRaw = await db
                .select({
                    entityType: requestsTable.entityType,
                    count: count(requestsTable.id),
                })
                .from(requestsTable)
                .where(and(eq(requestsTable.userId, targetUserId), eq(requestsTable.status, "approved")))
                .groupBy(requestsTable.entityType);

            const totalApprovedContributions = approvedRequestsStatsRaw.reduce((sum, stat) => sum + stat.count, 0);
            const contributionsByType = approvedRequestsStatsRaw.reduce((acc, stat) => {
                acc[stat.entityType] = stat.count;
                return acc;
            }, {} as Record<EntityTypes, number>);

            const pendingRequestsStatsRaw = await db
                .select({
                    entityType: requestsTable.entityType,
                    count: count(requestsTable.id),
                })
                .from(requestsTable)
                .where(and(eq(requestsTable.userId, targetUserId), eq(requestsTable.status, "pending")))
                .groupBy(requestsTable.entityType);

            const totalPendingContributions = pendingRequestsStatsRaw.reduce((sum, stat) => sum + stat.count, 0);

            const rejectedRequestsStatsRaw = await db
                .select({
                    entityType: requestsTable.entityType,
                    count: count(requestsTable.id),
                })
                .from(requestsTable)
                .where(and(eq(requestsTable.userId, targetUserId), eq(requestsTable.status, "rejected")))
                .groupBy(requestsTable.entityType);

            const totalRejectedContributions = rejectedRequestsStatsRaw.reduce((sum, stat) => sum + stat.count, 0);

            // Calculate total contribution points
            const totalPointsResult = await db
                .select({ total: sql<number>`sum(${contributionLogs.points})` })
                .from(contributionLogs)
                .where(eq(contributionLogs.userId, targetUserId));
            const totalContributionPoints = totalPointsResult[0]?.total ?? 0;

            // 3. Fetch Recent Contributions (last 10 approved)
            const recentContributionsRaw = await db
                .select({
                    id: requestsTable.id,
                    entityType: requestsTable.entityType,
                    entityId: requestsTable.entityId,
                    action: requestsTable.action,
                    requestDate: requestsTable.requestDate,
                    newData: requestsTable.newData,
                })
                .from(requestsTable)
                .where(and(eq(requestsTable.userId, targetUserId), eq(requestsTable.status, "approved")))
                .orderBy(desc(requestsTable.requestDate))
                .limit(10);

            const recentContributions = await Promise.all(
                recentContributionsRaw.map(async (req) => {
                    let wordName: string | null = null;
                    if (req.entityId) {
                        if (req.entityType === "words") {
                            const wordData = await db.select({ name: words.name }).from(words).where(eq(words.id, req.entityId)).limit(1);
                            wordName = wordData[0]?.name ?? null;
                        } else if (req.entityType === "related_words") {
                            // Assuming entityId for related_words is the ID of the *source* word of the relation
                            const wordData = await db.select({ name: words.name }).from(words).where(eq(words.id, req.entityId)).limit(1);
                            wordName = wordData[0]?.name ?? null;
                        } else if (req.entityType === "meanings") {
                            const meaningWithWord = await db.select({ wordId: meanings.wordId }).from(meanings).where(eq(meanings.id, req.entityId)).limit(1);
                            if (meaningWithWord[0]?.wordId) {
                                const wordData = await db.select({ name: words.name }).from(words).where(eq(words.id, meaningWithWord[0].wordId)).limit(1);
                                wordName = wordData[0]?.name ?? null;
                            }
                        } else if (req.entityType === "examples") {
                            const exampleWithMeaning = await db.select({ meaningId: examples.meaningId }).from(examples).where(eq(examples.id, req.entityId)).limit(1);
                            if (exampleWithMeaning[0]?.meaningId) {
                                const meaningWithWord = await db.select({ wordId: meanings.wordId }).from(meanings).where(eq(meanings.id, exampleWithMeaning[0].meaningId)).limit(1);
                                if (meaningWithWord[0]?.wordId) {
                                    const wordData = await db.select({ name: words.name }).from(words).where(eq(words.id, meaningWithWord[0].wordId)).limit(1);
                                    wordName = wordData[0]?.name ?? null;
                                }
                            }
                        }
                    }
                    return {
                        id: req.id.toString(),
                        entityType: req.entityType,
                        word: wordName ? { word: wordName } : null,
                        requestType: req.action,
                        createdAt: req.requestDate,
                        status: "approved",
                    };
                })
            );

            // 4. Fetch Saved Words (Conditional)
            let userSavedWordsData: any[] = [];
            let totalSavedWordsCount = 0;
            if (isOwnProfile) {
                const savedWordsRaw = await db
                    .select({
                        wordId: savedWords.wordId,
                        wordName: words.name,
                        savedAt: savedWords.createdAt,
                    })
                    .from(savedWords)
                    .innerJoin(words, eq(savedWords.wordId, words.id))
                    .where(eq(savedWords.userId, targetUserId))
                    .orderBy(desc(savedWords.createdAt))
                    .limit(5);

                userSavedWordsData = await Promise.all(
                    savedWordsRaw.map(async (sw) => {
                        const firstMeaningResult = await db
                            .select({ meaning: meanings.meaning })
                            .from(meanings)
                            .where(eq(meanings.wordId, sw.wordId))
                            .orderBy(asc(meanings.order))
                            .limit(1);
                        return {
                            wordId: sw.wordId,
                            wordName: sw.wordName,
                            savedAt: sw.savedAt,
                            firstMeaning: firstMeaningResult[0]?.meaning ?? null,
                        };
                    })
                );

                // Get total count of saved words
                const savedWordsCountResult = await db
                    .select({ count: count(savedWords.wordId) })
                    .from(savedWords)
                    .where(eq(savedWords.userId, targetUserId));
                totalSavedWordsCount = savedWordsCountResult[0]?.count ?? 0;
            }

            // 5. Fetch Badges
            const userBadgesRaw = await db
                .select({
                    slug: badges.slug,
                    nameTr: badges.nameTr,
                    nameEn: badges.nameEn,
                    descriptionTr: badges.descriptionTr,
                    descriptionEn: badges.descriptionEn,
                    icon: badges.icon,
                    awardedAt: usersToBadges.awardedAt,
                })
                .from(usersToBadges)
                .innerJoin(badges, eq(usersToBadges.badgeSlug, badges.slug))
                .where(eq(usersToBadges.userId, targetUserId));

            const allBadges = await db.select().from(badges);

            const badgesWithStatus = allBadges.map((badge) => {
                const earnedBadge = userBadgesRaw.find((ub) => ub.slug === badge.slug);
                return {
                    ...badge,
                    earned: !!earnedBadge,
                    awardedAt: earnedBadge?.awardedAt ?? null,
                };
            });

            // 6. Combine and return all data
            return {
                ...userProfile,
                contributionStats: {
                    totalApproved: totalApprovedContributions,
                    byType: contributionsByType,
                    totalPoints: totalContributionPoints,
                    totalPending: totalPendingContributions,
                    totalRejected: totalRejectedContributions,
                },
                recentContributions,
                savedWords: isOwnProfile ? userSavedWordsData : undefined,
                totalSavedWordsCount: isOwnProfile ? totalSavedWordsCount : undefined,
                badges: badgesWithStatus,
            };
        }),
    updateProfile: protectedProcedure
        .input(z.object({
            username: z.string().min(3),
            name: z.string().min(2),
        }))
        .mutation(async ({ ctx: { db, session }, input }) => {
            // Check if username is taken by another user
            const existingUser = await db.query.users.findFirst({
                where: sql`username = ${input.username} AND id != ${session.user.id}`,
            });

            if (existingUser) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Username is already taken"
                });
            }

            const updateData = {
                username: input.username,
                name: input.name,
            };

            await db.update(users)
                .set(updateData)
                .where(eq(users.id, session.user.id));

            return { success: true };
        }),
    clearUserSearchHistory: protectedProcedure.mutation(async ({ ctx: { db, session } }) => {
        await db.delete(userSearchHistory).where(eq(userSearchHistory.userId, session.user.id));
        return { success: true };
    }),
    deleteCurrentUser: protectedProcedure.mutation(async ({ ctx: { db, session } }) => {
        await db.delete(users).where(eq(users.id, session.user.id));
        return { success: true };
    }),
});
