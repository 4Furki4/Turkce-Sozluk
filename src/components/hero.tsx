"use client";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, PuzzleIcon, KeyboardIcon, ArrowRight, XCircle, CheckCircle2, BookOpen, TrendingUpIcon, Download, Wifi, HeartHandshake } from "lucide-react";
import { Link } from "@/src/i18n/routing";
import { Input } from "@heroui/input";
import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardFooter, CardHeader, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@heroui/react";
import { useDebounce } from "@uidotdev/usehooks";
import { cn } from "@/lib/utils";
import { TurkishKeyboard } from "./customs/utils/TurkishKeyboard"; // Keeping for reference if needed, but unused now
import { searchAutocompleteOffline, searchByPattern } from "@/src/lib/offline-db"; // Keeping for reference if needed
import { useTypewriter } from "../hooks/use-typewriter";
import { useOnlineStatus } from "@/src/hooks/use-online-status";

import { api } from "@/src/trpc/react";
import CustomCard from "./customs/heroui/custom-card";
import SearchContainer from "./customs/search/search-container";

// Removes TRENDING_TAGS constant

export default function Hero({ children }: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Home");
  const locale = useLocale()
  // State and logic moved to SearchContainer

  return (
    <div className="relative isolate min-h-[calc(100vh-var(--navbar-height))] flex flex-col justify-center">
      {/* Background Radial Gradient Top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, rgba(169, 17, 1, 0.09) 0%, transparent 70%)`
        }}
      />

      {/* Dot Pattern Background */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_2px,transparent_2px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] pointer-events-none opacity-35" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:pt-10 sm:pb-16 lg:px-8 w-full">
        {/* --- Hero Header Section --- */}
        <div className="mx-auto text-center space-y-6 mb-16">
          <div className="mx-auto max-w-3xl space-y-4">
            <h1 className="font-bold tracking-tight text-fs-4 sm:text-fs-6 text-foreground">
              {t.rich("hero.title", {
                red: (chunks) => <span className="text-primary">{chunks}</span>
              })}
            </h1>
            <p className="text-fs-1 sm:text-fs-2 leading-8 text-muted-foreground sm:text-xl font-sans text-balance">
              {t("hero.motto")}
            </p>
          </div>

          {/* Search Form */}
          {/* Search Form */}
          <div className="max-w-4xl mx-auto w-full">
            <SearchContainer className="w-full" />
          </div>
        </div>
        {/* Children Render (if any specifics needed, though Layout usually handles main content) */}
        <div className="mb-12">
          {children}
        </div>
        {/* --- Bento Grid Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">

          {/* Word of the Day - Spans 2 Columns */}
          <div className="md:col-span-2">
            <BentoWordOfTheDay locale={locale} />
          </div>

          {/* Utility Stack - Spans 1 Column */}
          <div className="flex flex-col gap-6">
            <BentoCommonMistake />
            <BentoGalatiMeshur />
          </div>

          {/* Features Row - Spans 3 Columns */}
          <div className="md:col-span-3">
            <BentoFeatures />
          </div>
        </div>


      </div>
    </div>
  );
}

// --- Bento Components ---

function BentoWordOfTheDay({ locale }: { locale: string }) {
  const t = useTranslations("Home");
  const isOnline = useOnlineStatus();
  const { data: wordOfTheDay, isLoading } = api.word.getWordOfTheDay.useQuery(undefined, {
    enabled: isOnline
  });

  if (isLoading) {
    return (
      <Card className="h-full min-h-[300px] dark:bg-background/60 bg-background/90 shadow-sm">
        <CardHeader className="flex flex-row justify-between items-start pt-6 px-8 relative z-10">
          <div className="w-32 h-6 bg-primary/10 rounded-md animate-pulse" />
          <div className="w-20 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
        </CardHeader>
        <CardBody className="px-8 py-4 flex flex-col justify-center gap-6 relative z-10">
          <div className="space-y-4">
            <div className="w-3/4 h-16 sm:h-20 bg-zinc-800/50 rounded-xl animate-pulse" />
            <div className="flex gap-2">
              <div className="w-16 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
              <div className="w-16 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-zinc-800/50 rounded-md animate-pulse" />
            <div className="w-full h-4 bg-zinc-800/50 rounded-md animate-pulse" />
            <div className="w-2/3 h-4 bg-zinc-800/50 rounded-md animate-pulse" />
          </div>
        </CardBody>
        <CardFooter className="px-8 pb-8 pt-0 relative z-10">
          <div className="w-full h-px bg-zinc-800/50 animate-pulse" />
        </CardFooter>
      </Card>
    );
  }

  const wordData = wordOfTheDay ? {
    word: wordOfTheDay.word.name,
    phonetic: wordOfTheDay.word.phonetic || "",
    meaning: wordOfTheDay.word.meanings[0]?.meaning || "",
    origin: wordOfTheDay.word.origin || null
  } : {
    word: t("hero.WordOfTheDay.mock.word"),
    phonetic: t("hero.WordOfTheDay.mock.phonetic"),
    meaning: t("hero.WordOfTheDay.mock.meaning"),
    origin: t("hero.WordOfTheDay.mock.origin")
  };




  return (
    <CustomCard className="h-full min-h-[300px]  shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />

      <CardHeader className="flex flex-row justify-between items-start pt-6 px-8 relative z-10">
        <div className="space-y-1">
          <span className="text-xs font-mono text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
            {t("hero.WordOfTheDay.title")}
          </span>
        </div>
        <Link href={{ pathname: "/search/[word]", params: { word: wordData.word } }} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          {t("hero.WordOfTheDay.details")} <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>

      <CardBody className="px-8 py-4 flex flex-col justify-center gap-4 relative z-10">
        <div>
          <h2 className="text-6xl sm:text-7xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
            {wordData.word}
          </h2>
          <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
            {/* Only show phonetic if it exists */}
            {wordData.phonetic && <span>/{wordData.phonetic}/</span>}
            {/* Divider */}
            {wordData.phonetic && wordData.origin && <span className="w-1 h-1 bg-zinc-700 rounded-full" />}
            {wordData.origin && <span>{wordData.origin}</span>}
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

function BentoCommonMistake() {
  const t = useTranslations("Home");
  const [offset, setOffset] = useState(0);
  const [randomSeed] = useState(() => Math.random().toString(36).slice(2));
  const isOnline = useOnlineStatus();
  const { data, isLoading } = api.extras.getMisspellings.useQuery(
    { limit: 1, offset, randomSeed },
    {
      enabled: isOnline,
    },
  );

  const handleNext = () => {
    if (data?.total && offset < data.total - 1) {
      setOffset(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (offset > 0) {
      setOffset(prev => prev - 1);
    }
  };

  const item = data?.data[0];

  return (
    <CustomCard className="h-[200px] dark:bg-background/50 bg-background/50 group relative overflow-hidden flex flex-col justify-center">
      {/* Glow Effect */}
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-transparent dark:from-10% dark:to-primary/20 bg-gradient-to-b from-transparent to-primary/20 pointer-events-none" />

      <CardHeader className="absolute top-0 left-0 pt-4 px-6 z-50 w-full flex flex-row justify-between items-center">
        <Link
          href="/sik-yapilan-yanlislar"
          className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {t("HomeExtras.misspellingsTitle")}
        </Link>
      </CardHeader>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-4">
        <Button isIconOnly size="sm" variant="light" className="text-muted-foreground hover:text-foreground" onPress={handlePrev} isDisabled={offset === 0}>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
        <Button isIconOnly size="sm" variant="light" className="text-muted-foreground hover:text-foreground" onPress={handleNext} isDisabled={!data?.total || offset >= data.total - 1}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <CardBody className="flex flex-row items-center justify-center gap-8 z-10">
        {isLoading ? (
          <div className="flex items-center gap-8 w-full justify-center">
            <div className="flex flex-col items-center gap-2 w-1/3">
              <div className="w-24 h-8 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="w-px h-12 bg-zinc-800/20" />
            <div className="flex flex-col items-center gap-2 w-1/3">
              <div className="w-24 h-8 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
        ) : item ? (
          <>
            <div className="flex flex-col items-center gap-2 group/wrong opacity-75">
              <span className="text-2xl sm:text-3xl font-serif text-zinc-400 line-through decoration-danger decoration-2 text-center">
                {item.wrong}
              </span>
              <XCircle className="w-5 h-5 text-danger" />
            </div>

            <div className="w-px h-12 bg-zinc-800" />

            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-semibold text-foreground text-center">
                {item.correct}
              </span>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">No data available</div>
        )}
      </CardBody>
    </CustomCard>
  )
}

function BentoGalatiMeshur() {
  const t = useTranslations("Home");
  const [offset, setOffset] = useState(0);
  const [randomSeed] = useState(() => Math.random().toString(36).slice(2));
  const isOnline = useOnlineStatus();
  const { data, isLoading } = api.extras.getGalatiMeshur.useQuery(
    { limit: 1, offset, randomSeed },
    {
      enabled: isOnline,
    },
  );

  const handleNext = () => {
    if (data?.total && offset < data.total - 1) {
      setOffset(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (offset > 0) {
      setOffset(prev => prev - 1);
    }
  };

  const item = data?.data[0];
  const explanationPreview = item?.explanation
    ? item.explanation.length > 120
      ? `${item.explanation.slice(0, 120).trimEnd()}...`
      : item.explanation
    : "";

  return (
    <CustomCard className="h-[220px] dark:bg-background/50 bg-background/50 group relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 p-4 opacity-50 transition-opacity">
        <BookOpen className="w-16 h-16 text-amber-500" />
      </div>

      <CardHeader className="pt-4 px-6 z-10 flex flex-row justify-between items-center">
        <Link
          href="/galati-meshur"
          className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          <BookOpen className="w-3 h-3" />
          {t("HomeExtras.galatiMeshurTitle")}
        </Link>
      </CardHeader>

      <CardBody className="px-6 py-2 z-10 flex-1 flex flex-col justify-center gap-3 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 w-full pr-10">
              <div className="h-6 w-3/4 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="w-full pr-10 space-y-2">
              <div className="h-4 w-full bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-zinc-800/10 dark:bg-zinc-800/50 rounded animate-pulse" />
            </div>
          </div>
        ) : item ? (
          <>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 pr-10 overflow-hidden">
              <p className="text-lg font-serif font-semibold text-foreground line-clamp-1 mb-2">
                {item.word}
              </p>
              <p className="text-[11px] font-mono uppercase tracking-wide text-amber-600 dark:text-amber-500 mb-1">
                {t("HomeExtras.explanation")}
              </p>
              <p className="text-[15px] leading-relaxed text-foreground/85 line-clamp-2">
                {explanationPreview}
              </p>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-sm">No data available</div>
        )}
      </CardBody>

      <CardFooter className="pt-0 pb-3 px-6 z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button isIconOnly size="sm" variant="light" className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400" onPress={handlePrev} isDisabled={offset === 0}>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Button>
          <Button isIconOnly size="sm" variant="light" className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400" onPress={handleNext} isDisabled={!data?.total || offset >= data.total - 1}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <span className="text-[11px] font-mono text-muted-foreground">
          {data?.total ? `${offset + 1}/${data.total}` : "0/0"}
        </span>

        {item ? (
          <Link
            href={{
              pathname: '/galati-meshur/[id]',
              params: {
                id: item.id.toString()
              }
            }}
            className="text-sm font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            {t("HomeExtras.readMore")}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{t("HomeExtras.readMore")}</span>
        )}
      </CardFooter>
    </CustomCard>
  )
}

function BentoFeatures() {
  const t = useTranslations("Home");

  const features = [
    {
      title: t("hero.offlineFeature.title"),
      description: t("hero.offlineFeature.description"),
      icon: <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Wifi className="w-6 h-6" /></div>,
      gradient: "from-blue-500/10 to-transparent"
    },
    {
      title: t("hero.pwaFeature.title"),
      description: t("hero.pwaFeature.description"),
      icon: <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><Download className="w-6 h-6" /></div>,
      gradient: "from-red-500/10 to-transparent"
    },
    {
      title: t("hero.feature1.title"),
      description: t("hero.feature1.description"),
      icon: <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500"><HeartHandshake className="w-6 h-6" /></div>,
      gradient: "from-green-500/10 to-transparent"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {features.map((feature, idx) => (
        <CustomCard key={idx} className="h-full bg-background/50 p-0">
          <CardBody className="p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${feature.gradient} dark:opacity-30 opacity-40 rounded-bl-full pointer-events-none`} />
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-balance text-muted-foreground leading-relaxed">{feature.description}</p>
          </CardBody>
        </CustomCard>
      ))}
    </div>
  )
}
