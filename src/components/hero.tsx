import { CardBody, CardFooter, CardHeader, Divider } from "@heroui/react";
import { ArrowRight, Download, HeartHandshake, Wifi } from "lucide-react";
import { getTranslations } from "next-intl/server";

import CustomCard from "./customs/heroui/custom-card";
import SearchContainer from "./customs/search/search-container";
import { BentoCommonMistake, BentoGalatiMeshur } from "./hero-client-extras";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import type { RouterOutputs } from "@/src/trpc/shared";
import InstallAppControl from "./install-app-control";
import { getHeadwordProps } from "@/src/lib/headword-presentation";
import KineticHeadline from "./kinetic-headline";

type PopularWords = RouterOutputs["word"]["getPopularWords"];
type WordOfTheDay = RouterOutputs["word"]["getWordOfTheDay"];
type MisspellingsData = RouterOutputs["extras"]["getMisspellings"];
type GalatiMeshurData = RouterOutputs["extras"]["getGalatiMeshur"];
type WordOfTheDayLabels = {
  title: string;
  details: string;
  example: string;
  mock: {
    word: string;
    phonetic: string;
    origin: string;
    meaning: string;
  };
};
type FeatureItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  action: React.ReactNode;
};

const emptyExtras = { data: [], total: 0 };
const fallbackPopularWords: PopularWords = [
  { id: -1, name: "merhaba", search_count: 0 },
  { id: -2, name: "sevgi", search_count: 0 },
  { id: -3, name: "özgür", search_count: 0 },
  { id: -4, name: "umut", search_count: 0 },
  { id: -5, name: "bilgi", search_count: 0 },
];

const resolveHeroQuery = async <T,>(
  label: string,
  query: Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await query;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    console.warn(`[Hero] ${label} unavailable; using deterministic fallback.`);
    return fallback;
  }
};

async function getHeroData() {
  const [
    initialPopularWords,
    initialWordOfTheDay,
    initialMisspellings,
    initialGalatiMeshur,
  ] = await Promise.all([
    resolveHeroQuery(
      "popular words",
      api.word.getPopularWords({ limit: 5, period: "last7Days" }),
      fallbackPopularWords,
    ),
    resolveHeroQuery(
      "word of the day",
      api.word.getWordOfTheDay(),
      null as WordOfTheDay,
    ),
    resolveHeroQuery(
      "misspellings",
      api.extras.getMisspellings({ limit: 1, offset: 0 }),
      emptyExtras as MisspellingsData,
    ),
    resolveHeroQuery(
      "galati meshur",
      api.extras.getGalatiMeshur({ limit: 1, offset: 0 }),
      emptyExtras as GalatiMeshurData,
    ),
  ]);

  return {
    initialPopularWords,
    initialWordOfTheDay,
    initialMisspellings,
    initialGalatiMeshur,
  };
}

export default async function Hero({
  children,
  animateHome = false,
}: {
  children?: React.ReactNode;
  animateHome?: boolean;
}) {
  const t = await getTranslations("Home");
  const {
    initialPopularWords,
    initialWordOfTheDay,
    initialMisspellings,
    initialGalatiMeshur,
  } = await getHeroData();
  const wordOfTheDayLabels: WordOfTheDayLabels = {
    title: t("hero.WordOfTheDay.title"),
    details: t("hero.WordOfTheDay.details"),
    example: t("hero.WordOfTheDay.example"),
    mock: {
      word: t("hero.WordOfTheDay.mock.word"),
      phonetic: t("hero.WordOfTheDay.mock.phonetic"),
      origin: t("hero.WordOfTheDay.mock.origin"),
      meaning: t("hero.WordOfTheDay.mock.meaning"),
    },
  };
  const features: FeatureItem[] = [
    {
      title: t("hero.offlineFeature.title"),
      description: t("hero.offlineFeature.description"),
      icon: (
        <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Wifi className="w-6 h-6" />
        </div>
      ),
      gradient: "from-blue-500/10 to-transparent",
      action: <Link href="/offline-dictionary" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("hero.offlineFeature.action")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>,
    },
    {
      title: t("hero.pwaFeature.title"),
      description: t("hero.pwaFeature.description"),
      icon: (
        <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center text-red-500">
          <Download className="w-6 h-6" />
        </div>
      ),
      gradient: "from-red-500/10 to-transparent",
      action: <InstallAppControl />,
    },
    {
      title: t("hero.feature1.title"),
      description: t("hero.feature1.description"),
      icon: (
        <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center text-green-500">
          <HeartHandshake className="w-6 h-6" />
        </div>
      ),
      gradient: "from-green-500/10 to-transparent",
      action: <Link href="/contribute-word" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">{t("hero.feature1.action")} <ArrowRight className="h-4 w-4" aria-hidden /></Link>,
    },
  ];

  return (
    <div data-home-page={animateHome ? "" : undefined} className="relative isolate min-h-[calc(100vh-var(--navbar-height))] flex flex-col justify-center">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] pointer-events-none -z-10"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(169, 17, 1, 0.09) 0%, transparent 70%)",
        }}
      />

      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] pointer-events-none opacity-35" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:pt-12 sm:pb-16 lg:px-8 w-full">
        <div className="home-composition mx-auto mb-10 space-y-6 text-center sm:mb-12 sm:space-y-8">
          {animateHome ? (
            <svg className="home-ink-trail" viewBox="0 0 1000 310" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path pathLength="1" d="M96 72C40 8 800 -18 908 72C1020 164 866 251 662 251H536Q500 251 500 310" />
            </svg>
          ) : null}
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 data-home-enter="title" className="text-balance font-bold tracking-tight text-fs-4 sm:text-fs-6 leading-[1.1] text-foreground">
              {animateHome ? (
                <>
                  <span className="sr-only">{t.rich("hero.title", { red: (chunks) => chunks })}</span>
                  <KineticHeadline>
                    {t.rich("hero.title", { red: (chunks) => <span className="text-primary">{chunks}</span> })}
                  </KineticHeadline>
                </>
              ) : t.rich("hero.title", { red: (chunks) => <span className="text-primary">{chunks}</span> })}
            </h1>
            <p data-home-enter="motto" className="text-fs-0 sm:text-fs-1 leading-relaxed text-muted-foreground font-sans text-balance">
              {t("hero.motto")}
            </p>
          </div>

          <div data-home-enter="search" className="relative max-w-4xl mx-auto w-full">
            {animateHome ? (
              <svg className="home-search-stroke" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <rect x="1" y="1" width="998" height="54" rx="8" pathLength="1" />
              </svg>
            ) : null}
            <SearchContainer
              className="w-full"
              initialTrendingWords={initialPopularWords}
            />
          </div>
        </div>

        {children ? <div data-home-enter="content" className="mb-10 sm:mb-12">{children}</div> : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          <div data-home-enter="word" className="min-w-0 lg:col-span-7">
            <BentoWordOfTheDay
              initialWordOfTheDay={initialWordOfTheDay}
              labels={wordOfTheDayLabels}
            />
          </div>

          <div data-home-enter="extras" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-5 lg:grid-cols-1">
            <BentoCommonMistake initialData={initialMisspellings} />
            <BentoGalatiMeshur initialData={initialGalatiMeshur} />
          </div>

          <div data-home-enter="features" className="min-w-0 mt-2 sm:mt-4 lg:col-span-12">
            <BentoFeatures features={features} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoWordOfTheDay({
  initialWordOfTheDay,
  labels,
}: {
  initialWordOfTheDay?: WordOfTheDay;
  labels: WordOfTheDayLabels;
}) {
  const wordData = initialWordOfTheDay
    ? {
      word: initialWordOfTheDay.word.name,
      phonetic: initialWordOfTheDay.word.phonetic || "",
      meaning: initialWordOfTheDay.word.meanings[0]?.meaning || "",
      origin: initialWordOfTheDay.word.origin || null,
    }
    : labels.mock;

  return (
    <CustomCard className="h-full min-h-80 bg-background/40 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-md blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />

      <CardHeader className="flex flex-row flex-wrap justify-between items-center gap-x-3 gap-y-1 pt-4 px-5 sm:px-8 relative z-10">
        <div className="space-y-1">
          <span className="text-xs font-mono text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
            {initialWordOfTheDay ? labels.title : labels.example}
          </span>
        </div>
        <Link
          href={{ pathname: "/search/[word]", params: { word: wordData.word } }}
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {labels.details} <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>

      <CardBody className="min-w-0 px-5 sm:px-8 py-6 sm:py-8 flex flex-col justify-center gap-5 relative z-10">
        <div className="dictionary-headword-container">
          <h2 {...getHeadwordProps(wordData.word)} lang="tr" className="dictionary-headword [--headword-max:var(--step-4)] sm:[--headword-max:var(--step-5)] lg:[--headword-max:var(--step-6)] text-fs-4 sm:text-fs-5 lg:text-fs-6 font-serif font-bold leading-[1.1] text-foreground mb-4">
            <Link href={{ pathname: "/search/[word]", params: { word: wordData.word } }} className="hover:text-primary underline-offset-8 hover:underline transition-colors">{wordData.word}</Link>
          </h2>
          <div className="dictionary-prose flex flex-wrap items-center gap-3 text-muted-foreground font-mono text-sm">
            {wordData.phonetic ? <span>/{wordData.phonetic}/</span> : null}
            {wordData.phonetic && wordData.origin ? (
              <span className="w-1 h-1 bg-zinc-700 rounded-md" />
            ) : null}
            {wordData.origin ? <span>{wordData.origin}</span> : null}
          </div>
        </div>

        <p lang={initialWordOfTheDay ? "tr" : undefined} className="dictionary-prose max-w-prose text-lg sm:text-xl lg:text-2xl text-foreground/85 italic leading-relaxed line-clamp-3">
          &ldquo;{wordData.meaning}&rdquo;
        </p>
      </CardBody>

      <CardFooter className="px-5 sm:px-8 pb-6 sm:pb-8 pt-0 relative z-10">
        <div className="h-px w-full bg-border" />
      </CardFooter>
    </CustomCard>
  );

}

function BentoFeatures({ features }: { features: FeatureItem[] }) {
  return (
    <CustomCard className="grid grid-cols-1 p-0 md:grid-cols-3">
      {features.map((feature, index) => (
        <div key={feature.title} className="h-full min-w-0 p-0 flex flex-col md:flex-row">
          {index === 0 ? null : (
            <>
              <Divider className="hidden md:block" orientation="vertical" />
              <Divider className="block md:hidden" orientation="horizontal" />
            </>
          )}
          <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6 lg:p-8 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${feature.gradient} dark:opacity-30 opacity-40 rounded-bl-full pointer-events-none`} />
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-balance text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
            <div className="mt-auto pt-3">{feature.action}</div>
          </div>
        </div>
      ))}
    </CustomCard>
  );

}
