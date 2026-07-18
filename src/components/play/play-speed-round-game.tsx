"use client";

import type { Session } from "@/src/lib/auth-client";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleHelp, Crown, Flame, Heart, RotateCcw, Settings2, Sparkles, Timer, Trophy, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./play-speed-round-game.module.css";

interface PlaySpeedRoundGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

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

type GameState = "setup" | "loading" | "playing" | "finished";

function ChoiceButton({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" className={`${styles.controlButton} ${className || ""}`} {...props}>{children}</button>;
}

function ReviewItem({ question, result, session }: { question: Question; result: AnswerResult | undefined; session: Session | null }) {
    const play = useTranslations("Play.speedRound");
    const [isSaved, setIsSaved] = useState(false);
    const saveWordMutation = api.user.saveWord.useMutation({
        onMutate: () => setIsSaved((current) => !current),
        onError: () => setIsSaved((current) => !current),
        onSuccess: (saved) => setIsSaved(saved),
    });

    return (
        <article className={`${styles.reviewItem} ${result?.isCorrect ? styles.reviewCorrect : styles.reviewIncorrect}`}>
            <span className={styles.reviewStatus}>{result?.isCorrect ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}</span>
            <div>
                <Link
                    href={{ pathname: "/search/[word]", params: { word: question.word } }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {question.word}
                </Link>
                <p>{question.correctMeaning}</p>
            </div>
            <button
                type="button"
                className={styles.saveButton}
                onClick={() => saveWordMutation.mutate({ wordId: question.id })}
                disabled={!session || saveWordMutation.isPending}
            >
                <Heart aria-hidden="true" className={isSaved ? styles.savedHeart : undefined} />
                {isSaved ? play("saved") : session ? play("save") : play("signInToSave")}
            </button>
        </article>
    );
}

export default function PlaySpeedRoundGame({ session }: PlaySpeedRoundGameProps) {
    const t = useTranslations("SpeedRoundGame");
    const play = useTranslations("Play.speedRound");
    const shouldReduceMotion = useReducedMotion();
    const [questionCount, setQuestionCount] = useState(10);
    const [timePerQuestion, setTimePerQuestion] = useState(10);
    const [source, setSource] = useState<"all" | "saved">("all");
    const [gameState, setGameState] = useState<GameState>("setup");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(timePerQuestion);
    const [results, setResults] = useState<AnswerResult[]>([]);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [scoreSubmitted, setScoreSubmitted] = useState(false);
    const [userRank, setUserRank] = useState<number | null>(null);
    const answerLockRef = useRef(false);
    const advanceTimerRef = useRef<number | null>(null);

    const { refetch } = api.game.getWordsForSpeedRound.useQuery(
        { questionCount, source },
        { enabled: false },
    );
    const { data: leaderboardData, refetch: refetchLeaderboard } = api.game.getLeaderboard.useQuery(
        { gameType: "speed_round", limit: 10 },
        { enabled: gameState === "finished" },
    );
    const submitScoreMutation = api.game.submitScore.useMutation({
        onSuccess: (data) => {
            if (data.success) {
                setUserRank(data.rank);
                setScoreSubmitted(true);
                void refetchLeaderboard();
            }
        },
    });

    const clearAdvanceTimer = useCallback(() => {
        if (advanceTimerRef.current !== null) {
            window.clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
        }
    }, []);

    useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

    const resetRound = useCallback(() => {
        clearAdvanceTimer();
        answerLockRef.current = false;
        setQuestions([]);
        setCurrentIndex(0);
        setTimeLeft(timePerQuestion);
        setResults([]);
        setStreak(0);
        setMaxStreak(0);
        setFeedback(null);
        setSelectedAnswer(null);
        setScoreSubmitted(false);
        setUserRank(null);
    }, [clearAdvanceTimer, timePerQuestion]);

    const startGame = useCallback(async () => {
        resetRound();
        setLoadError(null);
        setGameState("loading");

        try {
            const result = await refetch();
            const loadedQuestions = result.data?.questions as Question[] | undefined;

            if (loadedQuestions?.length) {
                setQuestions(loadedQuestions);
                setTimeLeft(timePerQuestion);
                setGameState("playing");
                return;
            }

            setLoadError(result.data?.error === "noSavedWords" ? play("noSavedWords") : play("noWords"));
        } catch {
            setLoadError(play("noWords"));
        }

        setGameState("setup");
    }, [play, refetch, resetRound, timePerQuestion]);

    const answerQuestion = useCallback((answer: string | null, remainingTime = timeLeft) => {
        const currentQuestion = questions[currentIndex];
        if (!currentQuestion || feedback !== null || answerLockRef.current) return;

        answerLockRef.current = true;
        const isCorrect = answer === currentQuestion.correctMeaning;
        const timeSpent = Math.max(0, timePerQuestion - remainingTime);
        const speedBonus = isCorrect ? Math.round((remainingTime / timePerQuestion) * 50) : 0;
        const streakMultiplier = isCorrect ? Math.min(streak + 1, 5) : 0;
        const pointsEarned = isCorrect ? (100 + speedBonus) * streakMultiplier : 0;

        if (isCorrect) {
            const nextStreak = streak + 1;
            setStreak(nextStreak);
            setMaxStreak((current) => Math.max(current, nextStreak));
        } else {
            setStreak(0);
        }

        setResults((current) => [...current, {
            questionId: currentQuestion.id,
            isCorrect,
            timeSpent,
            pointsEarned,
        }]);
        setSelectedAnswer(answer);
        setFeedback(isCorrect ? "correct" : "incorrect");

        advanceTimerRef.current = window.setTimeout(() => {
            answerLockRef.current = false;
            setFeedback(null);
            setSelectedAnswer(null);

            if (currentIndex < questions.length - 1) {
                setCurrentIndex((index) => index + 1);
                setTimeLeft(timePerQuestion);
                return;
            }

            setGameState("finished");
        }, shouldReduceMotion ? 0 : 720);
    }, [currentIndex, feedback, questions, shouldReduceMotion, streak, timeLeft, timePerQuestion]);

    useEffect(() => {
        if (gameState !== "playing" || feedback !== null) return;

        const timer = window.setInterval(() => {
            setTimeLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [feedback, gameState]);

    useEffect(() => {
        if (gameState === "playing" && feedback === null && timeLeft === 0) {
            answerQuestion(null, 0);
        }
    }, [answerQuestion, feedback, gameState, timeLeft]);

    const stats = useMemo(() => {
        const totalScore = results.reduce((sum, result) => sum + result.pointsEarned, 0);
        const correctCount = results.filter((result) => result.isCorrect).length;
        const accuracy = results.length ? Math.round((correctCount / results.length) * 100) : 0;
        const averageTime = results.length
            ? Math.round((results.reduce((sum, result) => sum + result.timeSpent, 0) / results.length) * 10) / 10
            : 0;

        return { totalScore, correctCount, accuracy, averageTime };
    }, [results]);

    const currentQuestion = questions[currentIndex];

    const returnToSetup = useCallback(() => {
        resetRound();
        setLoadError(null);
        setGameState("setup");
    }, [resetRound]);

    if (gameState === "setup") {
        return (
            <section className={styles.page} aria-labelledby="speed-round-title">
                <header className={styles.intro}>
                    <p className={styles.kicker}><Zap aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="speed-round-title">{t("title")}</h1>
                    <p>{play("setupDescription")}</p>
                </header>

                <div className={styles.setupLayout}>
                    <form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); void startGame(); }}>
                        <fieldset>
                            <legend>{t("questionCount")}</legend>
                            <div className={styles.choiceGrid}>
                                {[10, 15, 20].map((count) => (
                                    <ChoiceButton key={count} className={questionCount === count ? styles.selected : ""} aria-pressed={questionCount === count} onClick={() => setQuestionCount(count)}>{count}</ChoiceButton>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>{t("timePerQuestion")}</legend>
                            <div className={styles.choiceGrid}>
                                {[5, 10, 15].map((seconds) => (
                                    <ChoiceButton key={seconds} className={timePerQuestion === seconds ? styles.selected : ""} aria-pressed={timePerQuestion === seconds} onClick={() => setTimePerQuestion(seconds)}>{t("seconds", { count: seconds })}</ChoiceButton>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>{t("source")}</legend>
                            <div className={styles.choiceGrid}>
                                <ChoiceButton className={source === "all" ? styles.selected : ""} aria-pressed={source === "all"} onClick={() => setSource("all")}>{t("sourceAll")}</ChoiceButton>
                                <ChoiceButton className={source === "saved" ? styles.selected : ""} aria-pressed={source === "saved"} disabled={!session} onClick={() => setSource("saved")}>{t("sourceSaved")}</ChoiceButton>
                            </div>
                            {!session && <p className={styles.hint}>{t("signInForSaved")}</p>}
                            {loadError && <p className={styles.errorHint} role="alert">{loadError}</p>}
                        </fieldset>

                        <button className={styles.primaryAction} type="submit">{t("startGame")} <Zap aria-hidden="true" /></button>
                    </form>

                    <aside className={styles.instructions} aria-label={play("howToPlay")}>
                        <p>{play("howToPlay")}</p>
                        <ol>
                            <li><span>1</span>{play("stepOne")}</li>
                            <li><span>2</span>{play("stepTwo")}</li>
                            <li><span>3</span>{play("stepThree")}</li>
                        </ol>
                    </aside>
                </div>
            </section>
        );
    }

    if (gameState === "loading") {
        return (
            <section className={`${styles.page} ${styles.loadingPage}`} aria-labelledby="speed-round-title" aria-busy="true">
                <header className={styles.playHeader}>
                    <div>
                        <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundKicker")}</p>
                        <h1 id="speed-round-title">{t("title")}</h1>
                    </div>
                    <p className={styles.loadingLabel}>{t("loading")}</p>
                </header>
                <div className={styles.loadingBoard} aria-live="polite">
                    <span className={styles.loadingPrompt} />
                    <span className={styles.loadingWord} />
                    <div className={styles.loadingChoices}>
                        {Array.from({ length: 4 }, (_, index) => <span key={index} className={styles.loadingChoice} />)}
                    </div>
                </div>
            </section>
        );
    }

    if (gameState === "finished") {
        const totalTime = results.reduce((sum, result) => sum + result.timeSpent, 0);

        return (
            <section className={`${styles.page} ${styles.finished}`} aria-labelledby="finished-title">
                <p className={styles.kicker}><Trophy aria-hidden="true" /> {play("roundCompleteKicker")}</p>
                <h1 id="finished-title">{t("gameOver")}</h1>
                <p>{play("roundCompleteDescription")}</p>
                <div className={styles.scoreTotal}>
                    <strong>{stats.totalScore.toLocaleString()}</strong>
                    <span>{t("points")}</span>
                </div>
                <div className={styles.results}>
                    <span><b>{stats.correctCount}/{results.length}</b>{t("correct")}</span>
                    <span><b>{stats.accuracy}%</b>{t("accuracy")}</span>
                    <span><b>{maxStreak}</b>{t("maxStreak")}</span>
                    <span><b>{stats.averageTime}s</b>{t("avgTime")}</span>
                </div>

                {session && !scoreSubmitted && (
                    <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => submitScoreMutation.mutate({
                            gameType: "speed_round",
                            score: stats.totalScore,
                            accuracy: stats.accuracy,
                            maxStreak,
                            questionCount: results.length,
                            timeTaken: totalTime,
                        })}
                        disabled={submitScoreMutation.isPending}
                    >
                        <Trophy aria-hidden="true" /> {t("submitScore")}
                    </button>
                )}

                {scoreSubmitted && userRank !== null && (
                    <p className={styles.rank}><Crown aria-hidden="true" /> {t("yourRank")}: #{userRank}</p>
                )}

                {leaderboardData?.leaderboard.length ? (
                    <section className={styles.leaderboard} aria-labelledby="leaderboard-title">
                        <h2 id="leaderboard-title"><Crown aria-hidden="true" /> {t("leaderboard")}</h2>
                        <ol>
                            {leaderboardData.leaderboard.slice(0, 5).map((entry) => (
                                <li key={entry.userId} className={entry.userId === session?.user?.id ? styles.currentPlayer : undefined}>
                                    <span>#{entry.rank}</span>
                                    {entry.userImage ? <img src={entry.userImage} alt="" /> : <i aria-hidden="true" />}
                                    <b>{entry.userName || t("anonymous")}</b>
                                    <strong>{entry.bestScore.toLocaleString()}</strong>
                                </li>
                            ))}
                        </ol>
                    </section>
                ) : null}

                <div className={styles.finishedActions}>
                    <button type="button" className={styles.primaryAction} onClick={() => void startGame()}>{t("playAgain")} <RotateCcw aria-hidden="true" /></button>
                    <button type="button" className={styles.secondaryAction} onClick={returnToSetup}><Settings2 aria-hidden="true" /> {t("settings")}</button>
                </div>

                <section className={styles.review} aria-labelledby="review-title">
                    <h2 id="review-title"><CircleHelp aria-hidden="true" /> {play("review")}</h2>
                    <div>
                        {questions.map((question, index) => <ReviewItem key={question.id} question={question} result={results[index]} session={session} />)}
                    </div>
                </section>
            </section>
        );
    }

    return (
        <section className={styles.page} aria-labelledby="speed-round-title">
            <header className={styles.playHeader}>
                <div>
                    <p className={styles.kicker}><Zap aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="speed-round-title">{t("title")}</h1>
                </div>
                <div className={styles.scoreboard} aria-label={play("scoreboard")}>
                    <span><Flame aria-hidden="true" /> {streak}</span>
                    <span><Trophy aria-hidden="true" /> {stats.totalScore}</span>
                    <span className={timeLeft <= 3 ? styles.dangerTime : undefined} role="timer"><Timer aria-hidden="true" /> {timeLeft}s</span>
                    <button type="button" onClick={returnToSetup} aria-label={t("settings")}><Settings2 aria-hidden="true" /></button>
                </div>
            </header>

            <div className={styles.roundProgress} aria-label={`${currentIndex + 1}/${questions.length}`}>
                <span>{currentIndex + 1}/{questions.length}</span>
                <i><b style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }} /></i>
            </div>

            {currentQuestion && (
                <motion.div
                    key={currentQuestion.id}
                    className={styles.sprintBoard}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                >
                    <p>{t("whatMeans")}</p>
                    <h2>{currentQuestion.word}</h2>
                    <div className={styles.answerGrid}>
                        {currentQuestion.options.map((option, index) => {
                            const isCorrect = option === currentQuestion.correctMeaning;
                            const isSelected = option === selectedAnswer;
                            const feedbackClass = feedback && (isCorrect || isSelected)
                                ? isCorrect ? styles.correctAnswer : styles.incorrectAnswer
                                : "";

                            return (
                                <motion.button
                                    type="button"
                                    key={option}
                                    className={`${styles.answerButton} ${feedbackClass}`}
                                    onClick={() => answerQuestion(option)}
                                    disabled={feedback !== null}
                                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.045, duration: 0.18 }}
                                >
                                    <span>{String.fromCharCode(65 + index)}</span>
                                    {option}
                                    {feedback && isCorrect ? <Check aria-hidden="true" /> : null}
                                    {feedback && isSelected && !isCorrect ? <X aria-hidden="true" /> : null}
                                </motion.button>
                            );
                        })}
                    </div>
                    <p className={styles.bonusLine}><Zap aria-hidden="true" /> {t("fasterBonus")}</p>
                </motion.div>
            )}
        </section>
    );
}
