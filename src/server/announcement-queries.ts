import { db } from "@/db";
import { announcementTranslations } from "@/db/schema/announcement_translations";
import { announcements } from "@/db/schema/announcements";
import { and, eq, lte } from "drizzle-orm";
import { cacheLife } from "next/cache";

export type AnnouncementLocale = "en" | "tr";

type AnnouncementDatabase = Pick<typeof db, "select">;

interface PublishedAnnouncementInput {
  slug: string;
  locale: AnnouncementLocale;
}

export async function findPublishedAnnouncementBySlug(
  { slug, locale }: PublishedAnnouncementInput,
  database: AnnouncementDatabase = db,
) {
  const result = await database
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
      content: announcementTranslations.content,
      excerpt: announcementTranslations.excerpt,
    })
    .from(announcements)
    .leftJoin(
      announcementTranslations,
      and(
        eq(announcements.id, announcementTranslations.announcementId),
        eq(announcementTranslations.locale, locale),
      ),
    )
    .where(
      and(
        eq(announcements.slug, slug),
        eq(announcements.status, "published"),
        lte(announcements.publishedAt, new Date()),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function getCachedPublishedAnnouncementBySlug(
  slug: string,
  locale: AnnouncementLocale,
) {
  "use cache";
  cacheLife({
    stale: 300,
    revalidate: 3600,
    expire: 86400,
  });

  return findPublishedAnnouncementBySlug({ slug, locale });
}

export async function listEligiblePublishedAnnouncementSlugs(
  database: AnnouncementDatabase = db,
) {
  return database
    .select({ slug: announcements.slug })
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "published"),
        lte(announcements.publishedAt, new Date()),
      ),
    )
    .limit(100);
}
