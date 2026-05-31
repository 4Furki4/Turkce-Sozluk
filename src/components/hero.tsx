import { CardBody, CardFooter, CardHeader, Divider } from "@heroui/react";
import { ArrowRight, Download, HeartHandshake, Wifi } from "lucide-react";
import { getTranslations } from "next-intl/server";

import CustomCard from "./customs/heroui/custom-card";
import SearchContainer from "./customs/search/search-container";
import { BentoCommonMistake, BentoGalatiMeshur } from "./hero-client-extras";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import type { RouterOutputs } from "@/src/trpc/shared";

type PopularWords = RouterOutputs["word"]["getPopularWords"];
type WordOfTheDay = RouterOutputs["word"]["getWordOfTheDay"];
type MisspellingsData = RouterOutputs["extras"]["getMisspellings"];
type GalatiMeshurData = RouterOutputs["extras"]["getGalatiMeshur"];
type WordOfTheDayLabels = {
  title: string;
  details: string;
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
}: {
  children?: React.ReactNode;
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
    },
  ];

  return (
    <div className="relative isolate min-h-[calc(100vh-var(--navbar-height))] flex flex-col justify-center">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] pointer-events-none -z-10"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(169, 17, 1, 0.09) 0%, transparent 70%)",
        }}
      />

      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] pointer-events-none opacity-35" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:pt-10 sm:pb-16 lg:px-8 w-full">
        <div className="mx-auto text-center space-y-6 mb-16">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="font-bold tracking-tight text-fs-4 sm:text-fs-6 text-foreground">
              {t.rich("hero.title", {
                red: (chunks) => <span className="text-primary">{chunks}</span>,
              })}
            </h1>
            <p className="text-fs-1 sm:text-fs-2 leading-8 text-muted-foreground sm:text-xl font-sans text-balance">
              {t("hero.motto")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto w-full">
            <SearchContainer
              className="w-full"
              initialTrendingWords={initialPopularWords}
            />
          </div>
        </div>

        <div className="mb-12">{children}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="md:col-span-2">
            <BentoWordOfTheDay
              initialWordOfTheDay={initialWordOfTheDay}
              labels={wordOfTheDayLabels}
            />
          </div>

          <div className="flex flex-col gap-6">
            <BentoCommonMistake initialData={initialMisspellings} />
            <BentoGalatiMeshur initialData={initialGalatiMeshur} />
          </div>

          <div className="md:col-span-3">
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
    <CustomCard className="h-full min-h-[300px] shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-md blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />

      <CardHeader className="flex flex-row justify-between items-start pt-6 px-8 relative z-10">
        <div className="space-y-1">
          <span className="text-xs font-mono text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
            {labels.title}
          </span>
        </div>
        <Link
          href={{ pathname: "/search/[word]", params: { word: wordData.word } }}
          className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {labels.details} <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>

      <CardBody className="px-8 py-4 flex flex-col justify-center gap-4 relative z-10">
        <div>
          <h2 className="text-fs-4 sm:text-7xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
            {wordData.word}
          </h2>
          <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
            {wordData.phonetic ? <span>/{wordData.phonetic}/</span> : null}
            {wordData.phonetic && wordData.origin ? (
              <span className="w-1 h-1 bg-zinc-700 rounded-md" />
            ) : null}
            {wordData.origin ? <span>{wordData.origin}</span> : null}
          </div>
        </div>

        <p className="text-xl sm:text-2xl text-zinc-300 font-light italic leading-relaxed line-clamp-3">
          &ldquo;{wordData.meaning}&rdquo;
        </p>
      </CardBody>

      <CardFooter className="px-8 pb-8 pt-0 relative z-10">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50" />
      </CardFooter>
    </CustomCard>
  );

}

function BentoFeatures({ features }: { features: FeatureItem[] }) {
  return (
    <CustomCard className="grid grid-cols-1 md:grid-cols-3 border-1">
      {features.map((feature, index) => (
        <div key={feature.title} className="h-full bg-background/50 p-0 flex flex-col md:flex-row">
          {index === 0 ? null : (
            <>
              <Divider className="hidden md:block" orientation="vertical" />
              <Divider className="block md:hidden" orientation="horizontal" />
            </>
          )}
          <div className="p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${feature.gradient} dark:opacity-30 opacity-40 rounded-bl-full pointer-events-none`} />
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-balance text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </CustomCard>
  );

}
