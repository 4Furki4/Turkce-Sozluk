"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/src/trpc/react";
import { Button, Card, CardBody, Spinner, Select, SelectItem, Chip, Progress, Tooltip } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    RotateCcw,
    Play,
    Settings,
    Timer,
    Trophy,
    CheckCircle,
    XCircle,
    Zap,
    Flame,
    BookOpen,
    Heart,
    ExternalLink,
    Crown,
} from "lucide-react";
import { Session } from "@/src/lib/auth-client";
import CustomCard from "./heroui/custom-card";
import { Link as NextIntlLink } from "@/src/i18n/routing";

interface SpeedRoundGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

type GameState = "setup" | "loading" | "playing" | "finished";

interface Question {
    id: number;
    word: string;
    correctMeaning: string;
    options: string[];
}

interface AnswerResult {
    questionId: number;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
}

// Word Review Item Component with save functionality
function WordReviewItem({
    question,
    isCorrect,
    session,
    locale,
}: {
    question: Question;
    isCorrect: boolean;
    session: Session | null;
    locale: "en" | "tr";
}) {
    const t = useTranslations("SpeedRoundGame");
    const [isSaved, setIsSaved] = useState(false);

    const saveWordMutation = api.user.saveWord.useMutation({
        onMutate: () => {
            // Optimistic update - toggle immediately
            setIsSaved((prev) => !prev);
        },
        onError: () => {
            // Revert on error
            setIsSaved((prev) => !prev);
        },
        onSuccess: (result) => {
            // Sync with server result
            setIsSaved(result);
        },
    });

    const handleSave = () => {
        if (!session) return;
        saveWordMutation.mutate({ wordId: question.id });
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border ${isCorrect ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
            }`}>
            <div className="flex-shrink-0 mt-0.5">
                {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                    <XCircle className="w-5 h-5 text-danger" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <a
                    href={`/${locale}/search/${encodeURIComponent(question.word)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                    {question.word}
                    <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-sm text-default-600 mt-1 break-words">
                    {question.correctMeaning}
                </p>
            </div>
            <Button
                size="sm"
                variant={isSaved ? "solid" : "bordered"}
                color={isSaved ? "danger" : "default"}
                onPress={handleSave}
                isDisabled={!session || saveWordMutation.isPending}
                className="flex-shrink-0"
                startContent={<Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />}
            >
                {isSaved ? t("saved") : session ? t("saveWord") : t("signInToSave")}
            </Button>
        </div>
    );
}


export default function SpeedRoundGame({ session, locale }: SpeedRoundGameProps) {
    const t = useTranslations("SpeedRoundGame");

    // Game settings
    const [questionCount, setQuestionCount] = useState<string>("10");
    const [source, setSource] = useState<"all" | "saved">("all");
    const [timePerQuestion, setTimePerQuestion] = useState<string>("10");

    // Get numeric values
    const questionCountNum = parseInt(questionCount, 10) || 10;
    const timePerQuestionNum = parseInt(timePerQuestion, 10) || 10;

    // Game state
    const [gameState, setGameState] = useState<GameState>("setup");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(timePerQuestionNum);
    const [results, setResults] = useState<AnswerResult[]>([]);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [showFeedback, setShowFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    // Leaderboard state
    const [userRank, setUserRank] = useState<number | null>(null);
    const [scoreSubmitted, setScoreSubmitted] = useState(false);

    // Data fetching
    const { refetch } = api.game.getWordsForSpeedRound.useQuery(
        { questionCount: questionCountNum, source },
        { enabled: false }
    );

    // Leaderboard query
    const { data: leaderboardData, refetch: refetchLeaderboard } = api.game.getLeaderboard.useQuery(
        { gameType: "speed_round", limit: 10 },
        { enabled: gameState === "finished" }
    );

    // Submit score mutation
    const submitScoreMutation = api.game.submitScore.useMutation({
        onSuccess: (data) => {
            if (data.success && data.rank) {
                setUserRank(data.rank);
            }
            setScoreSubmitted(true);
            refetchLeaderboard();
        },
    });


    // Timer effect
    useEffect(() => {
        if (gameState !== "playing" || showFeedback !== null) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Time's up for this question
                    handleAnswer(null);
                    return timePerQuestionNum;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, showFeedback, timePerQuestionNum]);

    // Handle answer selection
    const handleAnswer = useCallback((answer: string | null) => {
        if (showFeedback !== null) return;

        const currentQuestion = questions[currentIndex];
        const isCorrect = answer === currentQuestion.correctMeaning;
        const timeSpent = timePerQuestionNum - timeLeft;

        // Calculate points: base 100 + speed bonus (faster = more points)
        let pointsEarned = 0;
        if (isCorrect) {
            const speedBonus = Math.round((timeLeft / timePerQuestionNum) * 50);
            const streakMultiplier = Math.min(streak + 1, 5); // Max 5x multiplier
            pointsEarned = (100 + speedBonus) * streakMultiplier;
        }

        // Update streak
        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            setMaxStreak((prev) => Math.max(prev, newStreak));
        } else {
            setStreak(0);
        }

        // Record result
        setResults((prev) => [
            ...prev,
            {
                questionId: currentQuestion.id,
                isCorrect,
                timeSpent,
                pointsEarned,
            },
        ]);

        // Show feedback
        setSelectedAnswer(answer);
        setShowFeedback(isCorrect ? "correct" : "incorrect");

        // Move to next question after delay
        setTimeout(() => {
            setShowFeedback(null);
            setSelectedAnswer(null);
            if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setTimeLeft(timePerQuestionNum);
            } else {
                setGameState("finished");
            }
        }, 1000);
    }, [currentIndex, questions, streak, timeLeft, timePerQuestionNum, showFeedback]);

    // Start game
    const startGame = useCallback(async () => {
        setQuestions([]);
        setCurrentIndex(0);
        setResults([]);
        setStreak(0);
        setMaxStreak(0);
        setTimeLeft(timePerQuestionNum);
        setShowFeedback(null);
        setSelectedAnswer(null);
        setUserRank(null);
        setScoreSubmitted(false);

        setGameState("loading");

        const result = await refetch();
        if (result.data?.questions && result.data.questions.length > 0) {
            setQuestions(result.data.questions as Question[]);
            setGameState("playing");
        } else {
            setGameState("setup");
        }
    }, [refetch, timePerQuestionNum]);

    // Restart game
    const restartGame = useCallback(() => {
        setGameState("setup");
        setQuestions([]);
        setCurrentIndex(0);
        setResults([]);
        setStreak(0);
        setMaxStreak(0);
        setUserRank(null);
        setScoreSubmitted(false);
    }, []);

    // Calculate final stats
    const stats = useMemo(() => {
        const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
        const correctCount = results.filter((r) => r.isCorrect).length;
        const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
        const avgTime = results.length > 0
            ? Math.round(results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length * 10) / 10
            : 0;

        return { totalScore, correctCount, accuracy, avgTime };
    }, [results]);

    const currentQuestion = questions[currentIndex];

    // Setup screen
    if (gameState === "setup") {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
                    <p className="text-default-500">{t("description")}</p>
                </div>

                <CustomCard className="shadow-lg">
                    <CardBody className="p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">{t("settings")}</h2>
                        </div>

                        {/* Question Count */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t("questionCount")}
                            </label>
                            <Select
                                selectedKeys={[questionCount]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0] as string;
                                    if (value) setQuestionCount(value);
                                }}
                                aria-label={t("questionCount")}
                            >
                                <SelectItem key="10">10</SelectItem>
                                <SelectItem key="15">15</SelectItem>
                                <SelectItem key="20">20</SelectItem>
                            </Select>
                        </div>

                        {/* Time Per Question */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t("timePerQuestion")}
                            </label>
                            <Select
                                selectedKeys={[timePerQuestion]}
                                onSelectionChange={(keys) => {
                                    const value = Array.from(keys)[0] as string;
                                    if (value) setTimePerQuestion(value);
                                }}
                                aria-label={t("timePerQuestion")}
                            >
                                <SelectItem key="5">{t("seconds", { count: 5 })}</SelectItem>
                                <SelectItem key="10">{t("seconds", { count: 10 })}</SelectItem>
                                <SelectItem key="15">{t("seconds", { count: 15 })}</SelectItem>
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
                            startContent={<Zap className="w-5 h-5" />}
                        >
                            {t("startGame")}
                        </Button>
                    </CardBody>
                </CustomCard>
            </div>
        );
    }

    // Loading state
    if (gameState === "loading") {
        return (
            <div className="flex flex-col items-center justify-center mx-auto min-h-[50vh] gap-4">
                <Spinner size="lg" color="primary" />
                <p className="text-default-500">{t("loading")}</p>
            </div>
        );
    }

    // Finished screen
    if (gameState === "finished") {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                >
                    <CustomCard className="shadow-xl">
                        <CardBody className="p-8 text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                <Trophy className="w-20 h-20 mx-auto text-warning" />
                            </motion.div>

                            <h2 className="text-2xl font-bold">{t("gameOver")}</h2>

                            <div className="text-5xl font-bold text-primary">
                                {stats.totalScore.toLocaleString()}
                            </div>
                            <p className="text-default-500">{t("points")}</p>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="p-4 bg-success/10 rounded-lg">
                                    <p className="text-sm text-default-500">{t("correct")}</p>
                                    <p className="text-2xl font-bold text-success">
                                        {stats.correctCount}/{results.length}
                                    </p>
                                </div>
                                <div className="p-4 bg-primary/10 rounded-lg">
                                    <p className="text-sm text-default-500">{t("accuracy")}</p>
                                    <p className="text-2xl font-bold text-primary">{stats.accuracy}%</p>
                                </div>
                                <div className="p-4 bg-warning/10 rounded-lg">
                                    <p className="text-sm text-default-500">{t("maxStreak")}</p>
                                    <p className="text-2xl font-bold text-warning">{maxStreak}🔥</p>
                                </div>
                                <div className="p-4 bg-secondary/10 rounded-lg">
                                    <p className="text-sm text-default-500">{t("avgTime")}</p>
                                    <p className="text-2xl font-bold">{stats.avgTime}s</p>
                                </div>
                            </div>

                            {/* Submit Score Section */}
                            {session && !scoreSubmitted && (
                                <div className="mt-6">
                                    <Button
                                        color="success"
                                        size="lg"
                                        className="w-full"
                                        onPress={() => {
                                            const totalTime = results.reduce((sum, r) => sum + r.timeSpent, 0);
                                            submitScoreMutation.mutate({
                                                gameType: "speed_round",
                                                score: stats.totalScore,
                                                accuracy: stats.accuracy,
                                                maxStreak: maxStreak,
                                                questionCount: results.length,
                                                timeTaken: totalTime,
                                            });
                                        }}
                                        isLoading={submitScoreMutation.isPending}
                                        startContent={<Trophy className="w-5 h-5" />}
                                    >
                                        {t("submitScore")}
                                    </Button>
                                </div>
                            )}

                            {/* Submitted Rank Display */}
                            {scoreSubmitted && userRank && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="mt-6 p-4 bg-primary/10 rounded-lg"
                                >
                                    <p className="text-sm text-default-500">{t("yourRank")}</p>
                                    <p className="text-3xl font-bold text-primary">#{userRank}</p>
                                </motion.div>
                            )}

                            {/* Leaderboard Section */}
                            {leaderboardData && leaderboardData.leaderboard.length > 0 && (
                                <div className="mt-6 text-left">
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-warning" />
                                        {t("leaderboard")}
                                    </h3>
                                    <div className="space-y-2">
                                        {leaderboardData.leaderboard.slice(0, 5).map((entry) => (
                                            <div
                                                key={entry.userId}
                                                className={`flex items-center gap-3 p-2 rounded-lg ${entry.userId === session?.user?.id ? "bg-primary/20" : "bg-default-100"
                                                    }`}
                                            >
                                                <span className={`w-6 text-center font-bold ${entry.rank === 1 ? "text-warning" :
                                                    entry.rank === 2 ? "text-default-400" :
                                                        entry.rank === 3 ? "text-orange-400" : "text-default-500"
                                                    }`}>
                                                    {entry.rank}
                                                </span>
                                                {entry.userImage ? (
                                                    <img
                                                        src={entry.userImage}
                                                        alt={entry.userName || ""}
                                                        className="w-6 h-6 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-default-300" />
                                                )}
                                                <span className="flex-1 truncate text-sm">
                                                    {entry.userName || t("anonymous")}
                                                </span>
                                                <span className="font-semibold text-sm">
                                                    {entry.bestScore.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 justify-center mt-6">
                                <Button
                                    color="primary"
                                    size="lg"
                                    onPress={startGame}
                                    startContent={<RotateCcw className="w-5 h-5" />}
                                >
                                    {t("playAgain")}
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
                        </CardBody>
                    </CustomCard>
                </motion.div>

                {/* Word Review Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <CustomCard className="shadow-lg">
                        <CardBody className="p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                {t("wordReview")}
                            </h3>
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const result = results[index];
                                    const isCorrect = result?.isCorrect ?? false;

                                    return (
                                        <WordReviewItem
                                            key={question.id}
                                            question={question}
                                            isCorrect={isCorrect}
                                            session={session}
                                            locale={locale}
                                        />
                                    );
                                })}
                            </div>
                        </CardBody>
                    </CustomCard>
                </motion.div>
            </div>
        );
    }

    // Playing state
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Chip color="primary" variant="flat">
                        {currentIndex + 1}/{questions.length}
                    </Chip>
                    {streak > 0 && (
                        <Chip color="warning" variant="flat" startContent={<Flame className="w-4 h-4" />}>
                            {streak}🔥
                        </Chip>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Chip
                        color={timeLeft <= 3 ? "danger" : "secondary"}
                        variant="flat"
                        startContent={<Timer className="w-4 h-4" />}
                        className="text-lg font-mono"
                    >
                        {timeLeft}s
                    </Chip>
                </div>
            </div>

            {/* Timer Progress */}
            <Progress
                value={(timeLeft / timePerQuestionNum) * 100}
                color={timeLeft <= 3 ? "danger" : "primary"}
                className="mb-6"
                size="sm"
            />

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <CustomCard className="shadow-xl mb-6">
                        <CardBody className="p-8 text-center">
                            <span className="text-xs uppercase tracking-wider text-default-500 mb-2 block">
                                {t("whatMeans")}
                            </span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-2">
                                {currentQuestion.word}
                            </h2>
                        </CardBody>
                    </CustomCard>
                </motion.div>
            </AnimatePresence>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correctMeaning;
                    const showResult = showFeedback !== null;

                    let buttonColor: "default" | "success" | "danger" = "default";
                    if (showResult) {
                        if (isCorrect) buttonColor = "success";
                        else if (isSelected) buttonColor = "danger";
                    }

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Button
                                size="lg"
                                variant={showResult && (isCorrect || isSelected) ? "solid" : "bordered"}
                                color={buttonColor}
                                className="w-full h-auto min-h-[60px] py-4 px-6 text-left justify-start whitespace-normal"
                                onPress={() => handleAnswer(option)}
                                isDisabled={showFeedback !== null}
                                startContent={
                                    showResult && isCorrect ? (
                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                    ) : showResult && isSelected && !isCorrect ? (
                                        <XCircle className="w-5 h-5 flex-shrink-0" />
                                    ) : null
                                }
                            >
                                <span className="text-sm whitespace-normal break-words">{option}</span>
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Score indicator */}
            <div className="text-center mt-6 text-sm text-default-400">
                <Zap className="w-4 h-4 inline mr-1" />
                {t("fasterBonus")}
            </div>
        </div>
    );
}
