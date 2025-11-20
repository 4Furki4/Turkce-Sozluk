import { z } from "zod";
import {
    createTRPCRouter,
    adminProcedure,
    publicProcedure,
} from "@/src/server/api/trpc";
import { badges, usersToBadges, badgeRequirementTypeEnum, badgeCategoryEnum } from "@/db/schema/gamification";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const badgeRouter = createTRPCRouter({
    getAll: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.select().from(badges);
    }),

    create: adminProcedure
        .input(
            z.object({
                slug: z.string().min(1),
                nameTr: z.string().min(1),
                nameEn: z.string().min(1),
                descriptionTr: z.string().min(1),
                descriptionEn: z.string().min(1),
                icon: z.string().min(1),
                requirementType: z.enum(badgeRequirementTypeEnum.enumValues),
                requirementValue: z.number().int().min(0),
                category: z.enum(badgeCategoryEnum.enumValues),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.db.query.badges.findFirst({
                where: eq(badges.slug, input.slug),
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Badge with this slug already exists",
                });
            }

            await ctx.db.insert(badges).values(input);
            return { success: true };
        }),

    update: adminProcedure
        .input(
            z.object({
                slug: z.string().min(1),
                nameTr: z.string().min(1),
                nameEn: z.string().min(1),
                descriptionTr: z.string().min(1),
                descriptionEn: z.string().min(1),
                icon: z.string().min(1),
                requirementType: z.enum(badgeRequirementTypeEnum.enumValues),
                requirementValue: z.number().int().min(0),
                category: z.enum(badgeCategoryEnum.enumValues),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.db.query.badges.findFirst({
                where: eq(badges.slug, input.slug),
            });

            if (!existing) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Badge not found",
                });
            }

            await ctx.db
                .update(badges)
                .set(input)
                .where(eq(badges.slug, input.slug));
            return { success: true };
        }),

    delete: adminProcedure
        .input(z.object({ slug: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(badges).where(eq(badges.slug, input.slug));
            return { success: true };
        }),

    assign: adminProcedure
        .input(
            z.object({
                userId: z.string(),
                badgeSlug: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user already has the badge
            const existing = await ctx.db.query.usersToBadges.findFirst({
                where: and(
                    eq(usersToBadges.userId, input.userId),
                    eq(usersToBadges.badgeSlug, input.badgeSlug)
                ),
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "User already has this badge",
                });
            }

            await ctx.db.insert(usersToBadges).values({
                userId: input.userId,
                badgeSlug: input.badgeSlug,
            });

            return { success: true };
        }),

    revoke: adminProcedure
        .input(
            z.object({
                userId: z.string(),
                badgeSlug: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(usersToBadges)
                .where(
                    and(
                        eq(usersToBadges.userId, input.userId),
                        eq(usersToBadges.badgeSlug, input.badgeSlug)
                    )
                );

            return { success: true };
        }),
});
