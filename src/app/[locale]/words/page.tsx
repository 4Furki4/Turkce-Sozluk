import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/src/i18n/routing";
import { getWordsHubCanonicalUrl } from "@/src/lib/seo-utils";
import {
  getPopularWordsForHub,
  getRecentlyUpdatedWordsForHub,
  SeoWordSummary,
  TURKISH_ALPHABET,
} from "@/src/lib/seo-word-index";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

async function safeSeoRead<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error("[WordsHubPage] SEO index data unavailable", error);
    return fallback;
  }
}

function WordLinkGrid({ words }: { words: SeoWordSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {words.map((word) => (
        <li key={word.id} className="border-b border-border/60 pb-3">
          <Link
            className="font-medium text-foreground hover:text-primary hover:underline"
            href={{ pathname: "/search/[word]", params: { word: word.name } }}
          >
            {word.name}
          </Link>
          {word.firstMeaning ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {word.firstMeaning}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";
  const t = await getTranslations({ locale, namespace: "WordsHub" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getWordsHubCanonicalUrl(resolvedLocale),
    },
    robots: {
      index: resolvedLocale === "tr",
      follow: true,
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "website",
      locale: resolvedLocale === "en" ? "en_US" : "tr_TR",
    },
  };
}

export default async function WordsHubPage({ params }: Props) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";
  setRequestLocale(resolvedLocale);

  const t = await getTranslations({ locale: resolvedLocale, namespace: "WordsHub" });
  const [popularWords, recentWords] = await Promise.all([
    safeSeoRead(getPopularWordsForHub(36), []),
    safeSeoRead(getRecentlyUpdatedWordsForHub(36), []),
  ]);

  return (
    <main className="w-full bg-background/40 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10">
        <header className="border-b border-border/70 pb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <section aria-labelledby="letters-title" className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="letters-title" className="text-xl font-semibold text-foreground">
                {t("alphabetTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("alphabetDescription")}
              </p>
            </div>
          </div>
          <nav aria-label={t("alphabetTitle")} className="flex flex-wrap gap-2">
            {TURKISH_ALPHABET.map((letter) => (
              <Link
                key={letter}
                href={{ pathname: "/words/[letter]", params: { letter } }}
                className="flex h-10 min-w-10 items-center justify-center rounded-md border border-border bg-background/40 px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {letter.toLocaleUpperCase("tr-TR")}
              </Link>
            ))}
          </nav>
        </section>

        {popularWords.length > 0 ? (
          <section aria-labelledby="popular-title" className="grid gap-4">
            <div>
              <h2 id="popular-title" className="text-xl font-semibold text-foreground">
                {t("popularTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("popularDescription")}
              </p>
            </div>
            <WordLinkGrid words={popularWords} />
          </section>
        ) : null}

        {recentWords.length > 0 ? (
          <section aria-labelledby="recent-title" className="grid gap-4">
            <div>
              <h2 id="recent-title" className="text-xl font-semibold text-foreground">
                {t("recentTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("recentDescription")}
              </p>
            </div>
            <WordLinkGrid words={recentWords} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
