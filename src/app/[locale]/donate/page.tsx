import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import DonationPageClient from "./donation-page-client";
import { donationLinks } from "@/src/config/donation";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Donation" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getStaticRouteCanonicalPath(
        "/donate",
        locale === "en" ? "en" : "tr",
      ),
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
    },
  };
}

export default async function DonatePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DonationPageClient
      githubSponsorsUrl={donationLinks.githubSponsors}
      patreonUrl={donationLinks.patreon}
    />
  );
}
