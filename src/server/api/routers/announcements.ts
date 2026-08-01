import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";
import { and, asc, desc, eq, gte, lte, ilike, sql } from "drizzle-orm";
import { announcements } from "@/db/schema/announcements";
import { announcementTranslations } from "@/db/schema/announcement_translations";
import { findPublishedAnnouncementBySlug } from "@/src/server/announcement-queries";

export const announcementsRouter = createTRPCRouter({
  listPublishedAnnouncements: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        locale: z.enum(["en", "tr"]).default("en"),
        orderBy: z.enum(["publishedAt", "createdAt"]).default("publishedAt"),
        orderDirection: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      const { page, limit, locale, orderBy, orderDirection } = input;
      const offset = (page - 1) * limit;

      try {
        // Get only published announcements
        const items = await db
          .select({
            id: announcements.id,
            slug: announcements.slug,
            status: announcements.status,
            imageUrl: announcements.imageUrl,
            actionUrl: announcements.actionUrl,
            actionTextKey: announcements.actionTextKey,
            publishedAt: announcements.publishedAt,
            createdAt: announcements.createdAt,
            title: announcementTranslations.title,
            excerpt: announcementTranslations.excerpt,
          })
          .from(announcements)
          .leftJoin(
            announcementTranslations,
            and(
              eq(announcements.id, announcementTranslations.announcementId),
              eq(announcementTranslations.locale, locale)
            )
          )
          .where(
            and(
              eq(announcements.status, "published"),
            )
          )
          .orderBy(
            orderBy === "publishedAt"
              ? (orderDirection === "asc" ? asc(announcements.publishedAt) : desc(announcements.publishedAt))
              : (orderDirection === "asc" ? asc(announcements.createdAt) : desc(announcements.createdAt))
          )
          .limit(limit)
          .offset(offset);
        // Count total published announcements for pagination
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(announcements)
          .where(
            and(
              eq(announcements.status, "published"),
              lte(announcements.publishedAt, new Date())
            )
          );

        const totalCount = countResult[0]?.count || 0;
        const totalPages = Math.ceil(totalCount / limit);

        return {
          items,
          meta: {
            currentPage: page,
            totalPages,
            totalCount,
          },
        };
      } catch (error) {
        console.error("Error fetching announcements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch announcements",
        });
      }
    }),

  getAnnouncementBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        locale: z.enum(["en", "tr"]).default("en"),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      try {
        const announcement = await findPublishedAnnouncementBySlug(input, db);

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Announcement not found",
          });
        }

        return announcement;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error fetching announcement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch announcement",
        });
      }
    }),

  searchAnnouncements: publicProcedure
    .input(
      z.object({
        query: z.string(),
        locale: z.enum(["en", "tr"]).default("en"),
        limit: z.number().default(5),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      const { query, locale, limit } = input;

      try {
        const results = await db
          .select({
            id: announcements.id,
            slug: announcements.slug,
            title: announcementTranslations.title,
            excerpt: announcementTranslations.excerpt,
            publishedAt: announcements.publishedAt,
          })
          .from(announcements)
          .leftJoin(
            announcementTranslations,
            and(
              eq(announcements.id, announcementTranslations.announcementId),
              eq(announcementTranslations.locale, locale)
            )
          )
          .where(
            and(
              eq(announcements.status, "published"),
              gte(announcements.publishedAt, new Date()),
              ilike(announcementTranslations.title, `%${query}%`)
            )
          )
          .orderBy(desc(announcements.publishedAt))
          .limit(limit);

        return results;
      } catch (error) {
        console.error("Error searching announcements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search announcements",
        });
      }
    }),
});
