"use client";

import { useTranslations } from "next-intl";
import { Search as SearchIcon, PuzzleIcon, KeyboardIcon, TrendingUpIcon, BookOpenIcon, TypeIcon } from "lucide-react";
import { useRouter } from "@/src/i18n/routing";
import { Input } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip } from "@heroui/react";
import { useDebounce } from "@uidotdev/usehooks";
import { cn } from "@/lib/utils";
import { TurkishKeyboard } from "@/src/components/customs/utils/TurkishKeyboard";
import { searchAutocompleteOffline, searchByPattern } from "@/src/lib/offline-db";
import { useTypewriter } from "@/src/hooks/use-typewriter";
import { api } from "@/src/trpc/react";

type SearchMode = "word" | "meaning";

interface MeaningResult {
    id: string;
    name: string;
    meaning: string;
    formattedMeaning: string | undefined;
}

interface SearchContainerProps {
    className?: string;
    inputWrapperClassName?: string;
    autoFocus?: boolean;
    onSearchComplete?: () => void;
    showTrending?: boolean;
}

export default function SearchContainer({
    className,
    inputWrapperClassName,
    autoFocus = false,
    onSearchComplete,
    showTrending = true
}: SearchContainerProps) {
    const t = useTranslations("Home");
    const router = useRouter();
    const [wordInput, setWordInput] = useState<string>("");
    const [inputError, setInputError] = useState<string>("");
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchMode, setSearchMode] = useState<SearchMode>("word");

    const { data: trendingWords, isLoading: isTrendingLoading } = api.word.getPopularWords.useQuery({
        limit: 5,
        period: 'last7Days'
    }, {
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        enabled: showTrending
    });

    const debouncedInput = useDebounce(wordInput, 300);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [meaningResults, setMeaningResults] = useState<MeaningResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { data: meaningSearchData, isFetching: isMeaningFetching } = api.search.searchByMeaning.useQuery(
        { query: debouncedInput },
        {
            enabled: searchMode === "meaning" && debouncedInput.length >= 3,
        }
    );

    const typeWriterText = useTypewriter([
        t("hero.searchPlaceholder"),
        t("hero.searchPlaceholderPhrase"),
        t("hero.searchPlaceholderProverb")
    ]);

    const isSelecting = useRef(false);

    // Handle meaning search results from tRPC
    useEffect(() => {
        if (searchMode === "meaning") {
            if (meaningSearchData) {
                setMeaningResults(meaningSearchData as MeaningResult[]);
                setShowRecommendations(meaningSearchData.length > 0);
            }
        }
    }, [meaningSearchData, searchMode]);

    // Handle word search (existing behavior)
    useEffect(() => {
        if (isSelecting.current) {
            isSelecting.current = false;
            return;
        }

        if (searchMode === "meaning") return;

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
    }, [debouncedInput, searchMode]);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [recommendations]);

    const currentResults = searchMode === "meaning" ? meaningResults : recommendations;
    const currentResultsLength = searchMode === "meaning" ? meaningResults.length : recommendations.length;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!currentResultsLength) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < currentResultsLength - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0) {
                    if (searchMode === "meaning") {
                        handleRecommendationClick(meaningResults[selectedIndex].name);
                    } else {
                        handleRecommendationClick(recommendations[selectedIndex]);
                    }
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
        setShowRecommendations(false);
        onSearchComplete?.();
        router.push({
            pathname: "/search/[word]",
            params: { word: encodeURIComponent(input) },
        });
    };

    const handleRecommendationClick = (word: string) => {
        isSelecting.current = true;
        setWordInput(word);
        setShowRecommendations(false);
        onSearchComplete?.();
        router.push({
            pathname: "/search/[word]",
            params: { word: encodeURIComponent(word) },
        });
    };

    return (
        <div className={cn("w-full", className)}>
            <form onSubmit={handleSearch}>
                <div className="relative group">
                    {/* Search Glow Effect - Only show if not in custom container (implied by default wrapper) */}
                    {!inputWrapperClassName && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-lg blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    )}

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
                            inputWrapper: cn(
                                "h-14",
                                "bg-background/50",
                                "backdrop-blur-md",
                                "border border-primary",
                                "shadow-lg",
                                "hover:border-zinc-700",
                                "group-data-[focus=true]:border-primary/50",
                                "group-data-[focus=true]:bg-zinc-900/60",
                                "group-data-[focus=true]:bg-background",
                                "transition-all duration-300",
                                "!cursor-text",
                                inputWrapperClassName
                            ),
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
                        autoFocus={autoFocus}
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
                            // Delay hiding recommendations to allow click event
                            setTimeout(() => {
                                setShowRecommendations(false);
                                setSelectedIndex(-1);
                            }, 200);
                        }}
                        color="primary"
                        variant="flat"
                        name="search"
                        placeholder={searchMode === "meaning" ? t("hero.searchByMeaningPlaceholder") : typeWriterText}
                        isInvalid={!!inputError}
                        errorMessage={inputError}
                        type="search"
                    />

                    {/* Recommendations Dropdown */}
                    {showRecommendations && (
                        <div className="absolute z-[999] w-full mt-2 bg-background/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto">
                            {(isLoading || (searchMode === "meaning" && isMeaningFetching)) ? (
                                <div className="p-2">
                                    {Array.from({ length: 3 }).map((_, idx) => (
                                        <div key={idx} className="h-10 mx-2 my-1 bg-white/5 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : searchMode === "meaning" ? (
                                meaningResults.length > 0 && (
                                    <ul role="listbox" className="py-2">
                                        {meaningResults.map((result, index) => (
                                            <li
                                                key={`${result.id}-${index}`}
                                                role="option"
                                                aria-selected={index === selectedIndex}
                                                className={cn(
                                                    "px-4 py-2.5 cursor-pointer transition-all duration-150 flex items-start gap-3 text-left",
                                                    index === selectedIndex ? "bg-primary/10 text-primary" : "text-zinc-400 hover:bg-white/5 hover:text-foreground"
                                                )}
                                                onClick={() => handleRecommendationClick(result.name)}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                <BookOpenIcon className={cn("w-4 h-4 mt-1 shrink-0", index === selectedIndex ? "text-primary" : "text-zinc-600")} />
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="font-medium text-foreground text-sm">{result.name}</span>
                                                    <span
                                                        className="text-xs text-zinc-500 line-clamp-1 [&>em]:text-primary [&>em]:font-semibold [&>em]:not-italic"
                                                        dangerouslySetInnerHTML={{ __html: result.formattedMeaning ?? result.meaning }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )
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

            {/* Search Mode Toggle */}
            <div className="flex justify-center mt-3">
                <div className="inline-flex items-center rounded-lg bg-background/50 backdrop-blur-md border border-zinc-800 p-0.5 gap-0.5">
                    <button
                        type="button"
                        onClick={() => {
                            setSearchMode("word");
                            setShowRecommendations(false);
                            setMeaningResults([]);
                            setSelectedIndex(-1);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                            searchMode === "word"
                                ? "bg-primary/15 text-primary shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <TypeIcon className="w-3.5 h-3.5" />
                        {t("hero.searchByWord")}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchMode("meaning");
                            setShowRecommendations(false);
                            setRecommendations([]);
                            setSelectedIndex(-1);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                            searchMode === "meaning"
                                ? "bg-primary/15 text-primary shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <BookOpenIcon className="w-3.5 h-3.5" />
                        {t("hero.searchByMeaning")}
                    </button>
                </div>
            </div>

            {/* Trending Tags */}
            {showTrending && (
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
                        trendingWords?.map((tag: any) => (
                            <button
                                key={tag.id}
                                onClick={() => handleRecommendationClick(tag.name)}
                                className="px-4 py-1.5 rounded-md bg-background shadow-sm border border-border  text-sm cursor-pointer hover:text-primary transition-all duration-200"
                            >
                                {tag.name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
