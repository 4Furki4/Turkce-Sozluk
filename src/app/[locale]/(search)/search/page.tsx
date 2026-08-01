import { redirect } from "@/src/i18n/routing";
import SearchPageClient from "./_pages/search-page-client";
import Hero from "@/src/components/hero";
import {
  normalizeSearchWord,
  OFFLINE_SEARCH_PARAM,
  SEARCH_QUERY_PARAM,
} from "@/src/lib/search-route";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";

  return {
    alternates: {
      canonical: getStaticRouteCanonicalPath("/search", resolvedLocale),
    },
  };
}

export default async function Page(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const { locale } = await props.params;
  const searchParams = await props.searchParams;

  const parsedWord = normalizeSearchWord(
    searchParams[SEARCH_QUERY_PARAM] ?? searchParams[OFFLINE_SEARCH_PARAM],
  );

  if (parsedWord) {
    if (!parsedWord.includes("_")) {
      // Handle query parameter based search (normal online progressive flow)
      redirect({
        href: {
          pathname: "/search/[word]",
          params: {
            word: parsedWord,
          },
        },
        locale,
      });
    }

    return <SearchPageClient initialWord={parsedWord} offlineOnly />;
  }

  if (searchParams[SEARCH_QUERY_PARAM] !== undefined) {
    const parsedEmptyWord = normalizeSearchWord(searchParams[SEARCH_QUERY_PARAM]);
    if (!parsedEmptyWord) {
      redirect({
        href: "/",
        locale,
      });
    }
  }

  return (
    <SearchPageClient>
      <Hero />
    </SearchPageClient>
  );
}
