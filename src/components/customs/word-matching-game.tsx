"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/src/trpc/react";
import { Button, Card, CardBody, Spinner, Select, SelectItem, Chip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    RotateCcw,
    Play,
    Settings,
    Timer,
    Clock,
    Trophy,
    CheckCircle,
    XCircle,
    Zap,
} from "lucide-react";
import { Session } from "@/src/lib/auth-client";
import CustomCard from "./heroui/custom-card";

interface WordMatchingGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

type GameState = "setup" | "loading" | "playing" | "finished";
type GameMode = "relaxed" | "timed";

interface MatchPair {
    id: number;
    word: string;
    meaning: string;
}

interface ShuffledItem {
    id: number;
    text: string;
    type: "word" | "meaning";
    matchedWith: number | null;
    isSelected: boolean;
}

export default function WordMatchingGame({ session, locale }: WordMatchingGameProps) {
    const t = useTranslations("WordMatchingGame");
    const pairs = [{
        key: 4,
        label: `4 ${t("pairs")}`
    }, {
        key: 6,
        label: `6 ${t("pairs")}`
    }, {
        key: 8,
        label: `8 ${t("pairs")}`
    }]
    // Game settings
    const [pairCount, setPairCount] = useState<string>("6");
    const [source, setSource] = useState<"all" | "saved">("all");
    const [gameMode, setGameMode] = useState<GameMode>("relaxed");

    // Get numeric value for API calls
    const pairCountNum = parseInt(pairCount, 10) || 6;

    // Game state
    const [gameState, setGameState] = useState<GameState>("setup");
    const [wordItems, setWordItems] = useState<ShuffledItem[]>([]);
    const [meaningItems, setMeaningItems] = useState<ShuffledItem[]>([]);
    const [selectedWord, setSelectedWord] = useState<number | null>(null);
    const [selectedMeaning, setSelectedMeaning] = useState<number | null>(null);
    const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
    const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);
    const [showError, setShowError] = useState<boolean>(false);

    // Timer state
    const [timeLeft, setTimeLeft] = useState<number>(60);
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [timerActive, setTimerActive] = useState<boolean>(false);

    // Data fetching
    const { data, isLoading, refetch } = api.game.getWordsForMatching.useQuery(
        { pairCount: pairCountNum, source },
        { enabled: gameState === "playing" || gameState === "setup" || gameState === "loading" }
    );

    // Initialize game when data is loaded (after loading state)
    useEffect(() => {
        if (data?.pairs && data.pairs.length > 0 && gameState === "loading") {
            const pairs = data.pairs as MatchPair[];

            // Create word items
            const words: ShuffledItem[] = pairs.map((p) => ({
                id: p.id,
                text: p.word,
                type: "word" as const,
                matchedWith: null,
                isSelected: false,
            }));

            // Create meaning items (shuffled)
            const meanings: ShuffledItem[] = [...pairs]
                .sort(() => Math.random() - 0.5)
                .map((p) => ({
                    id: p.id,
                    text: p.meaning,
                    type: "meaning" as const,
                    matchedWith: null,
                    isSelected: false,
                }));

            setWordItems(words);
            setMeaningItems(meanings);
            setMatchedPairs(new Set());
            setIncorrectAttempts(0);
            setSelectedWord(null);
            setSelectedMeaning(null);
            setElapsedTime(0);

            if (gameMode === "timed") {
                setTimeLeft(60);
                setTimerActive(true);
            } else {
                setTimerActive(true);
            }

            // Now transition to playing
            setGameState("playing");
        }
    }, [data, gameState, gameMode]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (timerActive && gameState === "playing") {
            interval = setInterval(() => {
                if (gameMode === "timed") {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            setTimerActive(false);
                            setGameState("finished");
                            return 0;
                        }
                        return prev - 1;
                    });
                } else {
                    setElapsedTime((prev) => prev + 1);
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, gameState, gameMode]);

    // Check for win condition
    useEffect(() => {
        if (gameState === "playing" && matchedPairs.size === pairCountNum && pairCountNum > 0) {
            setTimerActive(false);
            setGameState("finished");
        }
    }, [matchedPairs, pairCountNum, gameState]);

    // Handle word selection
    const handleWordClick = useCallback((wordId: number) => {
        if (matchedPairs.has(wordId)) return;

        setSelectedWord(wordId);
        setWordItems((prev) =>
            prev.map((item) => ({
                ...item,
                isSelected: item.id === wordId,
            }))
        );

        // If a meaning is already selected, check for match
        if (selectedMeaning !== null) {
            checkMatch(wordId, selectedMeaning);
        }
    }, [matchedPairs, selectedMeaning]);

    // Handle meaning selection
    const handleMeaningClick = useCallback((meaningId: number) => {
        if (matchedPairs.has(meaningId)) return;

        setSelectedMeaning(meaningId);
        setMeaningItems((prev) =>
            prev.map((item) => ({
                ...item,
                isSelected: item.id === meaningId,
            }))
        );

        // If a word is already selected, check for match
        if (selectedWord !== null) {
            checkMatch(selectedWord, meaningId);
        }
    }, [matchedPairs, selectedWord]);

    // Check if selected word and meaning match
    const checkMatch = useCallback((wordId: number, meaningId: number) => {
        if (wordId === meaningId) {
            // Correct match!
            setMatchedPairs((prev) => new Set([...prev, wordId]));
            setWordItems((prev) =>
                prev.map((item) =>
                    item.id === wordId ? { ...item, matchedWith: meaningId, isSelected: false } : item
                )
            );
            setMeaningItems((prev) =>
                prev.map((item) =>
                    item.id === meaningId ? { ...item, matchedWith: wordId, isSelected: false } : item
                )
            );
        } else {
            // Incorrect match
            setIncorrectAttempts((prev) => prev + 1);
            setShowError(true);
            setTimeout(() => {
                setShowError(false);
                setWordItems((prev) => prev.map((item) => ({ ...item, isSelected: false })));
                setMeaningItems((prev) => prev.map((item) => ({ ...item, isSelected: false })));
            }, 500);
        }

        // Reset selections
        setSelectedWord(null);
        setSelectedMeaning(null);
    }, []);

    // Start game - go to loading state and fetch fresh data
    const startGame = useCallback(async () => {
        // Clear previous items
        setWordItems([]);
        setMeaningItems([]);
        setMatchedPairs(new Set());
        setIncorrectAttempts(0);
        setSelectedWord(null);
        setSelectedMeaning(null);
        setElapsedTime(0);
        setTimeLeft(60);
        setTimerActive(false);

        // Go to loading state first - useEffect will transition to 'playing' when fresh data arrives
        setGameState("loading");

        // Fetch fresh data
        await refetch();
    }, [refetch]);

    // Restart game
    const restartGame = useCallback(() => {
        setGameState("setup");
        setMatchedPairs(new Set());
        setIncorrectAttempts(0);
        setSelectedWord(null);
        setSelectedMeaning(null);
        setTimerActive(false);
        setElapsedTime(0);
        setTimeLeft(60);
    }, []);

    // Calculate score
    const score = useMemo(() => {
        const baseScore = matchedPairs.size * 100;
        const penalty = incorrectAttempts * 10;
        return Math.max(0, baseScore - penalty);
    }, [matchedPairs.size, incorrectAttempts]);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Render setup screen
    if (gameState === "setup") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 w-full">
                <CustomCard className="w-full max-w-md">
                    <CardBody className="p-6 space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-primary mb-2">{t("title")}</h1>
                            <p className="text-muted-foreground">{t("description")}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                <span className="font-medium">{t("settings")}</span>
                            </div>

                            <Select
                                label={t("pairCount")}
                                selectedKeys={[pairCount]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0] as string;
                                    if (value) setPairCount(value);
                                }}
                            >
                                {pairs.map((pair) => (
                                    <SelectItem key={pair.key.toString()} textValue={pair.label}>
                                        {pair.label}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Select
                                label={t("mode")}
                                selectedKeys={[gameMode]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    if (value) setGameMode(value as GameMode);
                                }}
                            >
                                <SelectItem key="relaxed" startContent={<Clock className="w-4 h-4" />}>
                                    {t("relaxedMode")}
                                </SelectItem>
                                <SelectItem key="timed" startContent={<Timer className="w-4 h-4" />}>
                                    {t("timedMode")}
                                </SelectItem>
                            </Select>

                            <Select
                                label={t("source")}
                                selectedKeys={[source]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0];
                                    if (value) setSource(value as "all" | "saved");
                                }}
                                isDisabled={!session}
                                description={!session ? t("signInForSaved") : undefined}
                            >
                                <SelectItem key="all">{t("sourceAll")}</SelectItem>
                                <SelectItem key="saved">{t("sourceSaved")}</SelectItem>
                            </Select>
                        </div>

                        <Button
                            color="primary"
                            size="lg"
                            className="w-full font-bold"
                            startContent={<Play className="w-5 h-5" />}
                            onPress={startGame}
                        >
                            {t("startGame")}
                        </Button>
                    </CardBody>
                </CustomCard>
            </div>
        );
    }

    // Loading state - show while fetching fresh data
    if (gameState === "loading" || (gameState === "playing" && wordItems.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 w-full">
                <Spinner size="lg" color="primary" />
                <p className="mt-4 text-muted-foreground">{t("loading")}</p>
            </div>
        );
    }

    // Render finished screen
    if (gameState === "finished") {
        const isWin = matchedPairs.size === pairCountNum;

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 w-full">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md "
                >
                    <CustomCard className="overflow-visible">
                        <CardBody className="p-8 text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                {isWin ? (
                                    <Trophy className="w-20 h-20 mx-auto text-warning" />
                                ) : (
                                    <Clock className="w-20 h-20 mx-auto text-danger" />
                                )}
                            </motion.div>

                            <h2 className="text-2xl font-bold">
                                {isWin ? t("congratulations") : t("timeUp")}
                            </h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-primary/10 rounded-lg">
                                    <p className="text-sm text-muted-foreground">{t("matchedPairs")}</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {matchedPairs.size}/{pairCountNum}
                                    </p>
                                </div>
                                <div className="p-4 bg-success/10 rounded-lg">
                                    <p className="text-sm text-muted-foreground">{t("score")}</p>
                                    <p className="text-2xl font-bold text-success">{score}</p>
                                </div>
                                <div className="p-4 bg-danger/10 rounded-lg">
                                    <p className="text-sm text-muted-foreground">{t("mistakes")}</p>
                                    <p className="text-2xl font-bold text-danger">{incorrectAttempts}</p>
                                </div>
                                <div className="p-4 bg-secondary/10 rounded-lg">
                                    <p className="text-sm text-muted-foreground">{t("time")}</p>
                                    <p className="text-2xl font-bold">
                                        {gameMode === "timed"
                                            ? formatTime(60 - timeLeft)
                                            : formatTime(elapsedTime)}
                                    </p>
                                </div>
                            </div>

                            <Button
                                color="primary"
                                size="lg"
                                className="w-full font-bold"
                                startContent={<RotateCcw className="w-5 h-5" />}
                                onPress={restartGame}
                            >
                                {t("playAgain")}
                            </Button>
                        </CardBody>
                    </CustomCard>
                </motion.div>
            </div>
        );
    }

    // Render playing state
    return (
        <div className="flex flex-col items-center p-4 w-full max-w-5xl mx-auto">
            {/* Header with timer and stats */}
            <div className="w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Chip color="primary" variant="flat" startContent={<CheckCircle className="w-4 h-4" />}>
                        {matchedPairs.size}/{pairCountNum}
                    </Chip>
                    <Chip color="danger" variant="flat" startContent={<XCircle className="w-4 h-4" />}>
                        {incorrectAttempts}
                    </Chip>
                </div>

                <div className="flex items-center gap-4">
                    {gameMode === "timed" ? (
                        <Chip
                            color={timeLeft <= 10 ? "danger" : "secondary"}
                            variant="flat"
                            startContent={<Timer className="w-4 h-4" />}
                            className="text-lg font-mono"
                        >
                            {formatTime(timeLeft)}
                        </Chip>
                    ) : (
                        <Chip color="secondary" variant="flat" startContent={<Clock className="w-4 h-4" />} className="font-mono">
                            {formatTime(elapsedTime)}
                        </Chip>
                    )}

                    <Button
                        variant="flat"
                        size="sm"
                        startContent={<RotateCcw className="w-4 h-4" />}
                        onPress={restartGame}
                    >
                        {t("restart")}
                    </Button>
                </div>
            </div>

            {/* Game board */}
            <div className="w-full grid grid-cols-2 gap-4 md:gap-8">
                {/* Words column */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        {t("words")}
                    </h3>
                    <AnimatePresence>
                        {wordItems.map((item) => (
                            <motion.div
                                key={`word-${item.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CustomCard
                                    isPressable={!matchedPairs.has(item.id)}
                                    onPress={() => handleWordClick(item.id)}
                                    className={`
                                        transition-all duration-200
                                        ${matchedPairs.has(item.id)
                                            ? "bg-success/20 border-success cursor-default"
                                            : item.isSelected
                                                ? "bg-primary/30 border-primary ring-2 ring-primary"
                                                : showError && item.isSelected
                                                    ? "bg-danger/30 border-danger"
                                                    : "hover:bg-primary/10"
                                        }
                                    `}
                                >
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-2">
                                            {matchedPairs.has(item.id) && (
                                                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                                            )}
                                            <span className="font-semibold text-lg">{item.text}</span>
                                        </div>
                                    </CardBody>
                                </CustomCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Meanings column */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        {t("meanings")}
                    </h3>
                    <AnimatePresence>
                        {meaningItems.map((item) => (
                            <motion.div
                                key={`meaning-${item.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CustomCard
                                    isPressable={!matchedPairs.has(item.id)}
                                    onPress={() => handleMeaningClick(item.id)}
                                    className={`
                                        transition-all duration-200
                                        ${matchedPairs.has(item.id)
                                            ? "bg-success/20 border-success cursor-default"
                                            : item.isSelected
                                                ? "bg-primary/30 border-primary ring-2 ring-primary"
                                                : showError && item.isSelected
                                                    ? "bg-danger/30 border-danger"
                                                    : "hover:bg-primary/10"
                                        }
                                    `}
                                >
                                    <CardBody className="p-4">
                                        <div className="flex items-center gap-2">
                                            {matchedPairs.has(item.id) && (
                                                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                                            )}
                                            <span className="text-sm line-clamp-2">{item.text}</span>
                                        </div>
                                    </CardBody>
                                </CustomCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
                <Zap className="w-4 h-4 inline mr-1" />
                {t("instructions")}
            </div>
        </div>
    );
}
