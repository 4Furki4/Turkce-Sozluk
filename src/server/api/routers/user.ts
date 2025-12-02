import { count, eq, sql, desc } from "drizzle-orm";
import { adminProcedure, createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { z } from "zod";
import { SavedWordsResult } from "@/types";
import { savedWords } from "@/db/schema/saved_words";
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
        search: z.string().optional().default(""),
        sortAlphabet: z.enum(["az", "za"]).default("az"),
        sortDate: z.enum(["dateAsc", "dateDesc"]).default("dateAsc"),
        sortBy: z.enum(["alphabet", "date"]).default("date"),
        take: z.number().optional().default(10),
        skip: z.number().optional().default(0),
    })).query(async ({ ctx: { session, db }, input: { search, sortAlphabet, sortDate, sortBy, take, skip } }) => {
        const alphabetOrder =
            sortAlphabet === "az"
                ? sql`w.name ASC`
                : sortAlphabet === "za"
                    ? sql`w.name DESC`
                    : sql``;
        const dateOrder =
            sortDate === "dateAsc"
                ? sql`sw."createdAt" ASC`
                : sortDate === "dateDesc"
                    ? sql`sw."createdAt" DESC`
                    : sql``;
        const primaryOrder = sortBy === "alphabet" ? alphabetOrder : dateOrder;
        const secondaryOrder = sortBy === "alphabet" ? dateOrder : alphabetOrder;
        const searchClause = search ? sql`AND w.name ILIKE ${'%' + search + '%'}` : sql``;
        const userWithSavedWords = (await db.execute(sql`
    SELECT
    JSON_BUILD_OBJECT(
      'word_id',
      w.id,
      'word_name',
      w.name,
      'saved_at',
      sw."createdAt",
      'attributes',
      (
        SELECT
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'attribute_id',
              w_a.id,
              'attribute',
              w_a.attribute
            )
          )
        FROM
          words_attributes ws_a
          JOIN word_attributes w_a ON ws_a.attribute_id = w_a.id
        WHERE
          ws_a.word_id = w.id
      ),
      'root',
      JSON_BUILD_OBJECT('root', r.root, 'language', l.language_en),
      'meaning',
      (
        SELECT m.meaning
        FROM meanings m
        WHERE m.word_id = w.id
        ORDER BY m."order" ASC
        LIMIT 1
      )
    ) AS word_data
  FROM
    users u
    INNER JOIN saved_words sw ON u.id = sw.user_id
    LEFT JOIN words w ON sw.word_id = w.id
    LEFT JOIN roots r ON r.word_id = w.id
    LEFT JOIN languages l ON r.language_id::integer = l.id
  WHERE
    u.id = ${session.user.id} 
    ${searchClause}
    GROUP BY
    w.id,
    w.name,
    r.root,
    l.language_en,
    sw."createdAt" 
    ORDER BY
    ${primaryOrder},
    ${secondaryOrder}
    LIMIT ${take}
    OFFSET ${skip};
    `)) as SavedWordsResult[];

        return userWithSavedWords.length > 0 ? userWithSavedWords : [];
    }),
    getSavedWordCount: protectedProcedure.input(z.object({
        search: z.string().optional().default(""),
    })).query(async ({ ctx: { session, db }, input: { search } }) => {
        const searchClause = search ? sql`AND w.name ILIKE ${'%' + search + '%'}` : sql``;
        const result = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM saved_words sw
      JOIN words w ON sw.word_id = w.id
      WHERE sw.user_id = ${session.user.id}
      ${searchClause};
    `) as { count: number }[];
        return Number(result[0]?.count ?? 0);
    }),
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
        .input(
            z.object({
                wordId: z.number(),
            })
        )
        .mutation(async ({ input, ctx: { session, db } }) => {
            try {
                const savedWord = await db.insert(savedWords).values({
                    userId: session.user.id,
                    wordId: input.wordId,
                }).returning().execute()
            } catch (error) {
                await db.delete(savedWords).where(sql`user_id = ${session.user.id} AND word_id = ${input.wordId}`).execute()
                return false
            }
            return true
        }),
    getUsers: adminProcedure.input(
        z.object({
            take: z.number().optional().default(5),
            skip: z.number().optional().default(0),
        })
    ).query(async ({ ctx: { db }, input }) => {
        const users = await db.query.users.findMany({
            limit: input.take,
            offset: input.skip
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
