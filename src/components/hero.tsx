"use client";
import { useLocale, useTranslations } from "next-intl";
import { Search as SearchIcon, PuzzleIcon, KeyboardIcon, ArrowRight, XCircle, CheckCircle2, BookOpen, TrendingUpIcon, Download, Wifi, HeartHandshake } from "lucide-react";
import { Link, useRouter } from "@/src/i18n/routing";
import { Input } from "@heroui/input";
import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardFooter, CardHeader, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@heroui/react";
import { useDebounce } from "@uidotdev/usehooks";
import { cn } from "@/lib/utils";
import { TurkishKeyboard } from "./customs/utils/TurkishKeyboard";
import { searchAutocompleteOffline, searchByPattern } from "@/src/lib/offline-db";
import { useTypewriter } from "../hooks/use-typewriter";

import { api } from "@/src/trpc/react";

// Removes TRENDING_TAGS constant

export default function Hero({ children }: {
  children: React.ReactNode;
}) {
  const t = useTranslations("Home");
  const locale = useLocale()
  const router = useRouter();
  const [wordInput, setWordInput] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const { data: trendingWords, isLoading: isTrendingLoading } = api.word.getPopularWords.useQuery({
    limit: 5,
    period: 'last7Days'
  }, {
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const debouncedInput = useDebounce(wordInput, 300);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const typeWriterText = useTypewriter([
    t("hero.searchPlaceholder"),
    t("hero.searchPlaceholderPhrase"),
    t("hero.searchPlaceholderProverb")
  ]);

  const isSelecting = useRef(false);

  useEffect(() => {
    if (isSelecting.current) {
      isSelecting.current = false;
      return;
    }

    if (debouncedInput.length < 2) {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      let results: string[] = [];

      if (debouncedInput.includes("_")) {
        const patternResults = await searchByPattern(debouncedInput);
        results = patternResults.map(w => w.word_name);
      } else {
        results = await searchAutocompleteOffline(debouncedInput);
      }

      setRecommendations(results);
      setShowRecommendations(results.length > 0);
      setIsLoading(false);
    };

    fetchSuggestions();
  }, [debouncedInput]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [recommendations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recommendations?.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < recommendations.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleRecommendationClick(recommendations[selectedIndex]);
        } else {
          handleSearch(e as unknown as React.FormEvent);
        }
        break;
      case "Escape":
        setShowRecommendations(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const input = wordInput.trim();
    if (!input) {
      setInputError(t("hero.searchError"));
      setWordInput("");
      return;
    }
    setWordInput("");
    setInputError("");
    router.push({
      pathname: "/search/[word]",
      params: { word: encodeURIComponent(input) },
    });
  };

  const handleRecommendationClick = (word: string) => {
    isSelecting.current = true;
    setWordInput(word);
    setShowRecommendations(false);
    router.push({
      pathname: "/search/[word]",
      params: { word: encodeURIComponent(word) },
    });
  };

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      {/* Background Radial Gradient Top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, rgba(169, 17, 1, 0.15) 0%, transparent 70%)`
        }}
      />

      {/* Dot Pattern Background */}
      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] pointer-events-none opacity-50" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-16 lg:px-8 w-full">
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
          <div className="max-w-4xl mx-auto w-full">
            <form onSubmit={handleSearch}>
              <div className="relative group">
                {/* Search Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-lg blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                <Input
                  endContent={
                    <div className="flex items-center gap-1">
                      <Popover placement="bottom" classNames={{ content: "bg-background" }}>
                        <PopoverTrigger>
                          <Button className="bg-transparent" isIconOnly variant="flat" radius="none">
                            <PuzzleIcon className="w-5 h-5 text-default-400 cursor-pointer hover:text-primary transition-colors" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="px-1 py-2 max-w-[250px]">
                            <div className="text-small">{t("hero.patternSearchTooltip")}</div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Popover placement="bottom-end" classNames={{ content: "bg-background" }}>
                        <PopoverTrigger>
                          <Button className="bg-transparent" isIconOnly variant="flat" radius="none" aria-label={t("hero.turkishLetters")}>
                            <Tooltip content={t("hero.turkishLetters")}>
                              <KeyboardIcon className="text-default-400 hover:text-primary transition-colors" />
                            </Tooltip>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="grid grid-cols-3 gap-1">
                          <TurkishKeyboard className="bg-background/50 border border-border" onCharClick={(char) => setWordInput((prev) => prev + char)} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  }
                  classNames={{
                    inputWrapper: [
                      "h-14",
                      "bg-background/50",
                      "backdrop-blur-md",
                      "border border-primary",
                      "shadow-lg",
                      "hover:border-zinc-700",
                      "group-data-[focus=true]:border-primary/50",
                      "group-data-[focus=true]:bg-zinc-900/60",
                      "transition-all duration-300",
                      "!cursor-text"
                    ],
                    input: [
                      "text-lg",
                      "text-foreground",
                      "placeholder:text-muted-foreground/50",
                    ]
                  }}
                  startContent={
                    <button type="submit" className="p-2 hover:bg-white/5 rounded-full transition-colors mr-2" aria-label="search button">
                      <SearchIcon className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </button>
                  }
                  aria-required
                  autoFocus
                  aria-label="search words"
                  value={wordInput}
                  onKeyDown={handleKeyDown}
                  onValueChange={(val) => {
                    setWordInput(val);
                    if (val.trim()) {
                      setInputError("");
                      setShowRecommendations(true);
                    } else {
                      setShowRecommendations(false);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowRecommendations(false);
                      setSelectedIndex(-1);
                    }, 200);
                  }}
                  color="primary"
                  variant="flat"
                  name="search"
                  placeholder={typeWriterText}
                  isInvalid={!!inputError}
                  errorMessage={inputError}
                  type="search"
                />

                {/* Recommendations Dropdown */}
                {showRecommendations && (
                  <div className="absolute z-50 w-full mt-2 bg-background/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                      <div className="p-2">
                        {Array.from({ length: 3 }).map((_, idx) => (
                          <div key={idx} className="h-10 mx-2 my-1 bg-white/5 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      recommendations.length > 0 && (
                        <ul role="listbox" className="py-2">
                          {recommendations.map((wordName, index) => (
                            <li
                              key={wordName}
                              role="option"
                              aria-selected={index === selectedIndex}
                              className={cn(
                                "px-6 py-3 cursor-pointer transition-all duration-150 flex items-center gap-3",
                                index === selectedIndex ? "bg-primary/10 text-primary" : "text-zinc-400 hover:bg-white/5 hover:text-foreground"
                              )}
                              onClick={() => handleRecommendationClick(wordName)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <SearchIcon className={cn("w-4 h-4", index === selectedIndex ? "text-primary" : "text-zinc-600")} />
                              {wordName}
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                )}
              </div>
            </form>

            {/* Trending Tags */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2 min-h-[32px]">
              <span className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mr-2">
                <TrendingUpIcon className="w-4 h-4" /> {t("Trending")}:
              </span>
              {isTrendingLoading ? (
                <>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 w-24 bg-zinc-800/50 rounded-lg animate-pulse border border-zinc-800/50" />
                  ))}
                </>
              ) : (
                trendingWords?.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleRecommendationClick(tag.name)}
                    className="px-4 py-1.5 rounded-lg bg-background/50 border border-zinc-800 text-sm text-zinc-300 hover:text-primary hover:border-primary/50 transition-all duration-200"
                  >
                    {tag.name}
                  </button>
                ))
              )}
            </div>
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

  // Localized Mock Data
  const mockWord = {
    word: t("hero.WordOfTheDay.mock.word"),
    phonetic: t("hero.WordOfTheDay.mock.phonetic"),
    meaning: t("hero.WordOfTheDay.mock.meaning"),
    origin: t("hero.WordOfTheDay.mock.origin")
  };

  return (
    <Card className="h-full min-h-[300px] dark:bg-background/60 bg-background/90 border border-zinc-800 shadow-none hover:border-zinc-700 transition-colors group relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-500" />

      <CardHeader className="flex flex-row justify-between items-start pt-6 px-8 relative z-10">
        <div className="space-y-1">
          <span className="text-xs font-mono text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
            {t("hero.WordOfTheDay.title")}
          </span>
        </div>
        <Link href={{ pathname: "/search/[word]", params: { word: mockWord.word } }} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          {t("hero.WordOfTheDay.details")} <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>

      <CardBody className="px-8 py-4 flex flex-col justify-center gap-4 relative z-10">
        <div>
          <h2 className="text-6xl sm:text-7xl font-serif font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
            {mockWord.word}
          </h2>
          <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
            <span>/{mockWord.phonetic}/</span>
            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
            <span>{mockWord.origin}</span>
          </div>
        </div>

        <p className="text-xl sm:text-2xl text-zinc-300 font-light italic leading-relaxed">
          &ldquo;{mockWord.meaning}&rdquo;
        </p>
      </CardBody>

      <CardFooter className="px-8 pb-8 pt-0 relative z-10">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50" />
      </CardFooter>
    </Card>
  );
}

function BentoCommonMistake() {
  const t = useTranslations("Home");
  return (
    <Card className="h-[200px] dark:bg-background/50 bg-background/50 border border-zinc-800 shadow-none hover:border-zinc-700 transition-colors group relative overflow-hidden flex flex-col justify-center">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

      <CardHeader className="absolute top-0 left-0 pt-4 px-6 z-10">
        <span className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {t("HomeExtras.misspellingsTitle")}
        </span>
      </CardHeader>

      <CardBody className="flex flex-row items-center justify-center gap-8 z-10">
        <div className="flex flex-col items-center gap-2 group/wrong opacity-60">
          <span className="text-2xl sm:text-3xl font-serif text-zinc-500 line-through decoration-danger decoration-2">
            {t("HomeExtras.misspellingExample.wrong")}
          </span>
          <XCircle className="w-5 h-5 text-danger" />
        </div>

        <div className="w-px h-12 bg-zinc-800" />

        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
            {t("HomeExtras.misspellingExample.correct")}
          </span>
          <CheckCircle2 className="w-5 h-5 text-success" />
        </div>
      </CardBody>
    </Card>
  )
}

function BentoGalatiMeshur() {
  const t = useTranslations("Home");
  return (
    <Card className="h-[200px] dark:bg-background/50 bg-background/50 border border-amber-900/30 shadow-none hover:border-amber-700/50 transition-colors group relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <BookOpen className="w-24 h-24 text-amber-500" />
      </div>

      <CardHeader className="pt-4 px-6 z-10">
        <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <BookOpen className="w-3 h-3" />
          {t("HomeExtras.galatiMeshurTitle")}
        </span>
      </CardHeader>

      <CardBody className="px-6 py-2 z-10 flex flex-col justify-center gap-2">
        {/* Wrong */}
        <div className="flex items-center gap-2 opacity-60">
          <XCircle className="w-4 h-4 text-danger shrink-0" />
          <span className="text-lg font-serif text-zinc-500 line-through decoration-danger/50">
            {t("HomeExtras.galatiMeshurExample.wrong")}
          </span>
        </div>

        {/* Correct */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span className="text-lg font-serif font-bold text-foreground">
            {t("HomeExtras.galatiMeshurExample.correct")}
          </span>
        </div>

        {/* Explanation (Truncated/Hidden for now as requested for cleaner grid) */}
        {/* <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
           {t("HomeExtras.galatiMeshurExample.explanation")}
        </p> */}
      </CardBody>
    </Card>
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
        <Card key={idx} className="h-full border border-zinc-800 bg-background/50 hover:border-zinc-700 transition-colors shadow-none">
          <CardBody className="p-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${feature.gradient} opacity-20 rounded-bl-full pointer-events-none`} />
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-balance text-muted-foreground leading-relaxed">{feature.description}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}