import Hero from "@/src/components/hero";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";

  return {
    alternates: {
      canonical: getStaticRouteCanonicalPath("/", resolvedLocale),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <Hero />;
}
