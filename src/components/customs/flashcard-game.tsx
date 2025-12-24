"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/src/trpc/react";
import { useTranslations } from "next-intl";
import { Button, Card, CardBody, Select, SelectItem, Spinner, Chip } from "@heroui/react";
import {
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Shuffle,
    Play,
    Settings,
} from "lucide-react";
import { Session } from "@/src/lib/auth-client";


interface FlashcardGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

interface FlashcardWord {
    id: number;
    name: string;
    phonetic: string | null;
    meaning: string;
    partOfSpeech: string | null;
}

type GameState = "setup" | "playing" | "finished";

export default function FlashcardGame({ session, locale }: FlashcardGameProps) {
    const t = useTranslations("FlashcardGame");

    // Game settings
    const [cardCount, setCardCount] = useState<number>(10);
    const [source, setSource] = useState<"all" | "saved">("all");

    // Game state
    const [gameState, setGameState] = useState<GameState>("setup");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [words, setWords] = useState<FlashcardWord[]>([]);

    // API query
    const { data, isLoading, refetch } = api.game.getRandomWordsForFlashcards.useQuery(
        { count: cardCount, source },
        { enabled: gameState === "playing" || gameState === "setup" }
    );

    // Start game
    const startGame = useCallback(() => {
        refetch().then((result) => {
            if (result.data?.words && result.data.words.length > 0) {
                setWords(result.data.words);
                setCurrentIndex(0);
                setIsFlipped(false);
                setGameState("playing");
            }
        });
    }, [refetch]);

    // Navigation
    const goNext = useCallback(() => {
        if (currentIndex < words.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex((prev) => prev + 1), 100);
        } else {
            setGameState("finished");
        }
    }, [currentIndex, words.length]);

    const goPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex((prev) => prev - 1), 100);
        }
    }, [currentIndex]);

    const flipCard = useCallback(() => {
        setIsFlipped((prev) => !prev);
    }, []);

    const shuffleCards = useCallback(() => {
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        setWords(shuffled);
        setCurrentIndex(0);
        setIsFlipped(false);
    }, [words]);

    const restartGame = useCallback(() => {
        setGameState("setup");
        setCurrentIndex(0);
        setIsFlipped(false);
        setWords([]);
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== "playing") return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    flipCard();
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    goNext();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    goPrevious();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [gameState, flipCard, goNext, goPrevious]);

    const currentWord = words[currentIndex];

    // Setup screen
    if (gameState === "setup") {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
                    <p className="text-default-500">{t("description")}</p>
                </div>

                <Card className="shadow-lg">
                    <CardBody className="p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">{t("settings")}</h2>
                        </div>

                        {/* Card Count Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t("cardCount")}
                            </label>
                            <Select
                                selectedKeys={[cardCount.toString()]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    if (value) setCardCount(Number(value));
                                }}
                                aria-label={t("cardCount")}
                            >
                                <SelectItem key="10">10</SelectItem>
                                <SelectItem key="20">20</SelectItem>
                                <SelectItem key="30">30</SelectItem>
                                <SelectItem key="50">50</SelectItem>
                            </Select>
                        </div>

                        {/* Source Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t("source")}
                            </label>
                            <Select
                                selectedKeys={[source]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0] as "all" | "saved";
                                    if (value) setSource(value);
                                }}
                                aria-label={t("source")}
                            >
                                <SelectItem key="all">{t("sourceAll")}</SelectItem>
                                <SelectItem key="saved" isDisabled={!session}>
                                    {t("sourceSaved")}
                                    {!session && ` (${t("signInForSaved")})`}
                                </SelectItem>
                            </Select>
                        </div>

                        <Button
                            color="primary"
                            size="lg"
                            className="w-full mt-4"
                            onPress={startGame}
                            startContent={<Play className="w-5 h-5" />}
                            isLoading={isLoading}
                        >
                            {t("startGame")}
                        </Button>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Loading state
    if (isLoading || words.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Spinner size="lg" />
                <p className="text-default-500">{t("loading")}</p>
            </div>
        );
    }

    // Finished state
    if (gameState === "finished") {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">🎉</h1>
                    <p className="text-xl">
                        {locale === "en"
                            ? `You've reviewed all ${words.length} cards!`
                            : `${words.length} kartın tamamını incelediniz!`}
                    </p>
                </div>

                <div className="flex gap-4 justify-center">
                    <Button
                        color="primary"
                        size="lg"
                        onPress={() => {
                            setCurrentIndex(0);
                            setIsFlipped(false);
                            setGameState("playing");
                        }}
                        startContent={<RotateCcw className="w-5 h-5" />}
                    >
                        {t("restart")}
                    </Button>
                    <Button
                        variant="bordered"
                        size="lg"
                        onPress={restartGame}
                        startContent={<Settings className="w-5 h-5" />}
                    >
                        {t("settings")}
                    </Button>
                </div>
            </div>
        );
    }

    // Playing state
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <Chip color="primary" variant="flat">
                    {t("progress", { current: currentIndex + 1, total: words.length })}
                </Chip>
            </div>

            {/* Flashcard */}
            <div className="perspective-1000 mb-8">
                <motion.div
                    className="relative w-full aspect-[3/2] cursor-pointer"
                    onClick={flipCard}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isFlipped ? "back" : "front"}
                            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="absolute inset-0"
                        >
                            <Card
                                className={`w-full h-full shadow-xl ${isFlipped
                                    ? "bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30"
                                    : "bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30"
                                    }`}
                            >
                                <CardBody className="flex flex-col items-center justify-center p-8 h-full">
                                    {!isFlipped ? (
                                        // Front - Word
                                        <>
                                            <span className="text-xs uppercase tracking-wider text-default-500 mb-2">
                                                {t("word")}
                                            </span>
                                            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
                                                {currentWord.name}
                                            </h2>
                                            {currentWord.phonetic && (
                                                <p className="text-lg text-default-500 italic">
                                                    [{currentWord.phonetic}]
                                                </p>
                                            )}
                                            <p className="text-sm text-default-400 mt-6">
                                                {t("clickToFlip")}
                                            </p>
                                        </>
                                    ) : (
                                        // Back - Meaning
                                        <>
                                            <span className="text-xs uppercase tracking-wider text-default-500 mb-2">
                                                {t("meaning")}
                                            </span>
                                            {currentWord.partOfSpeech && (
                                                <Chip size="sm" variant="flat" className="mb-4">
                                                    {currentWord.partOfSpeech}
                                                </Chip>
                                            )}
                                            <p className="text-xl md:text-2xl text-center leading-relaxed">
                                                {currentWord.meaning}
                                            </p>
                                            <p className="text-sm text-default-400 mt-6">
                                                {t("clickToFlip")}
                                            </p>
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button
                    isIconOnly
                    variant="flat"
                    onPress={goPrevious}
                    isDisabled={currentIndex === 0}
                    aria-label={t("previous")}
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>

                <Button
                    color="primary"
                    onPress={flipCard}
                >
                    {t("flip")}
                </Button>

                <Button
                    isIconOnly
                    variant="flat"
                    onPress={goNext}
                    aria-label={t("next")}
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                    isIconOnly
                    variant="light"
                    onPress={shuffleCards}
                    aria-label={t("shuffle")}
                >
                    <Shuffle className="w-5 h-5" />
                </Button>

                <Button
                    isIconOnly
                    variant="light"
                    onPress={restartGame}
                    aria-label={t("restart")}
                >
                    <RotateCcw className="w-5 h-5" />
                </Button>
            </div>

            {/* Keyboard hints */}
            <div className="text-center mt-6 text-sm text-default-400 hidden md:block">
                <span className="inline-flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-default-100 rounded text-xs">Space</kbd>
                    {t("flip")}
                </span>
                <span className="mx-3">•</span>
                <span className="inline-flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-default-100 rounded text-xs">←</kbd>
                    <kbd className="px-2 py-0.5 bg-default-100 rounded text-xs">→</kbd>
                    {locale === "en" ? "Navigate" : "Gezinme"}
                </span>
            </div>
        </div>
    );
}
