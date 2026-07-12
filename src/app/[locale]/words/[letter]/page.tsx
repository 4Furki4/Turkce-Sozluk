import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/src/i18n/routing";
import { getWordsLetterCanonicalUrl } from "@/src/lib/seo-utils";
import {
  getPopularWordsByLetter,
  getWordsByLetter,
  SeoWordSummary,
  TURKISH_ALPHABET,
} from "@/src/lib/seo-word-index";
import { getValidLetterOrNotFound } from "./letter-utils";

type Props = {
  params: Promise<{ locale: string; letter: string }>;
};

export const dynamic = "force-dynamic";

async function safeSeoRead<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error("[WordsLetterPage] SEO index data unavailable", error);
    return fallback;
  }
}

function WordDirectoryList({ words }: { words: SeoWordSummary[] }) {
  return (
    <ul className="columns-1 gap-8 sm:columns-2 lg:columns-3">
      {words.map((word) => (
        <li key={word.id} className="mb-4 break-inside-avoid border-b border-border/60 pb-3">
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
  const { locale, letter } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";
  const validLetter = getValidLetterOrNotFound(letter);
  const displayLetter = validLetter.toLocaleUpperCase("tr-TR");
  const t = await getTranslations({ locale: resolvedLocale, namespace: "WordsHub" });

  return {
    title: t("letterMetaTitle", { letter: displayLetter }),
    description: t("letterMetaDescription", { letter: displayLetter }),
    alternates: {
      canonical: getWordsLetterCanonicalUrl(validLetter, resolvedLocale),
    },
    robots: {
      index: resolvedLocale === "tr",
      follow: true,
    },
    openGraph: {
      title: t("letterMetaTitle", { letter: displayLetter }),
      description: t("letterMetaDescription", { letter: displayLetter }),
      type: "website",
      locale: resolvedLocale === "en" ? "en_US" : "tr_TR",
    },
  };
}

export default async function WordsLetterPage({ params }: Props) {
  const { locale, letter } = await params;
  const resolvedLocale = locale === "en" ? "en" : "tr";
  const validLetter = getValidLetterOrNotFound(letter);
  const displayLetter = validLetter.toLocaleUpperCase("tr-TR");
  setRequestLocale(resolvedLocale);

  const t = await getTranslations({ locale: resolvedLocale, namespace: "WordsHub" });
  const [popularWords, words] = await Promise.all([
    safeSeoRead(getPopularWordsByLetter(validLetter, 36), []),
    safeSeoRead(getWordsByLetter(validLetter), []),
  ]);

  return (
    <main className="w-full bg-background/40 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10">
        <header className="border-b border-border/70 pb-8">
          <Link className="text-sm text-primary hover:underline" href="/words">
            {t("backToIndex")}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {t("letterTitle", { letter: displayLetter })}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {t("letterDescription", { letter: displayLetter, count: words.length })}
          </p>
        </header>

        <nav aria-label={t("alphabetTitle")} className="flex flex-wrap gap-2">
          {TURKISH_ALPHABET.map((alphabetLetter) => (
            <Link
              key={alphabetLetter}
              href={{ pathname: "/words/[letter]", params: { letter: alphabetLetter } }}
              aria-current={alphabetLetter === validLetter ? "page" : undefined}
              className={`flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${
                alphabetLetter === validLetter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/40 text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {alphabetLetter.toLocaleUpperCase("tr-TR")}
            </Link>
          ))}
        </nav>

        {popularWords.length > 0 ? (
          <section aria-labelledby="letter-popular-title" className="grid gap-4">
            <div>
              <h2 id="letter-popular-title" className="text-xl font-semibold text-foreground">
                {t("letterPopularTitle", { letter: displayLetter })}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("letterPopularDescription")}
              </p>
            </div>
            <WordDirectoryList words={popularWords} />
          </section>
        ) : null}

        <section aria-labelledby="letter-all-title" className="grid gap-4">
          <div>
            <h2 id="letter-all-title" className="text-xl font-semibold text-foreground">
              {t("letterAllTitle", { letter: displayLetter })}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("letterAllDescription", { count: words.length })}
            </p>
          </div>
          {words.length > 0 ? (
            <WordDirectoryList words={words} />
          ) : (
            <p className="rounded-md border border-border bg-background/40 p-4 text-sm text-muted-foreground">
              {t("noWordsForLetter")}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
