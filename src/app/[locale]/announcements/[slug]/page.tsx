import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/routing";
import Image from "next/image";
import { formatDate } from "@/src/utils/date";
import { MarkdownRenderer } from "@/src/components/markdown-renderer";
import { notFound } from "next/navigation";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { getAnnouncementCanonicalPath } from "@/src/lib/seo-utils";
import {
  type AnnouncementLocale,
  getCachedPublishedAnnouncementBySlug,
  listEligiblePublishedAnnouncementSlugs,
} from "@/src/server/announcement-queries";

interface AnnouncementDetailPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export const instant = false;

export async function generateStaticParams() {
  const announcements = await listEligiblePublishedAnnouncementSlugs();

  return announcements.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params
}: AnnouncementDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const resolvedLocale = locale as AnnouncementLocale;
  const announcement = await getCachedPublishedAnnouncementBySlug(
    slug,
    resolvedLocale,
  );

  if (!announcement) {
    notFound();
  }

  return {
    title: announcement.title,
    description: announcement.excerpt || undefined,
    alternates: {
      canonical: getAnnouncementCanonicalPath(slug, resolvedLocale),
    },
    openGraph: announcement.imageUrl
      ? {
        images: [
          {
            url: announcement.imageUrl,
            alt: announcement.title || "",
          },
        ],
      }
      : undefined,
  };
}

async function AnnouncementDetail({
  params
}: AnnouncementDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Announcements" });

  const announcement = await getCachedPublishedAnnouncementBySlug(
    slug,
    locale as AnnouncementLocale,
  );
  if (!announcement) return notFound();

  return (
    <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link
            href={{ pathname: "/announcements" }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t("backToAnnouncements")}
          </Link>
        </div>

        <CustomCard className="border-2 border-border rounded-md px-2 py-4 w-full">
          <div className="px-4 pb-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold">{announcement.title}</h1>
              <p className="text-sm text-gray-500">
                {formatDate(announcement.publishedAt, locale)}
              </p>
            </div>
          </div>

          {announcement.imageUrl && (
            <div className="px-6 mb-6 relative w-full h-64">
              <Image
                src={announcement.imageUrl}
                alt={announcement.title || ""}
                fill
                className="object-cover rounded-md"
              />
            </div>
          )}

          <div className="px-4">
            <div className="prose max-w-none">
              {announcement.content ? (
                <MarkdownRenderer content={announcement.content} />
              ) : (
                <p className="text-gray-600">{t("noContent")}</p>
              )}
            </div>

            {announcement.actionUrl && (
              <div className="mt-8 flex justify-center">
                <a
                  href={announcement.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                >
                  {announcement.actionTextKey
                    ? t(announcement.actionTextKey)
                    : t("learnMore")}
                </a>
              </div>
            )}
          </div>
        </CustomCard>
    </div>
  );
}

export default async function AnnouncementDetailPage(
  props: AnnouncementDetailPageProps,
) {
  return await AnnouncementDetail(props);
}
