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

interface AnswerOption {
    token: string;
    text: string;
}

interface Question {
    token: string;
    word: string;
    options: AnswerOption[];
    /** Available for guest practice only; never delivered before a rated answer. */
    correctOptionToken?: string;
    correctMeaning?: string;
    wordId?: number;
}

interface AnswerResult {
    questionToken: string;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
    correctMeaning?: string;
}

interface GuestQuestionPayload {
    id: number;
    word: string;
    correctMeaning: string;
    options: string[];
}

type GameState = "setup" | "loading" | "playing" | "finished";

type PendingSpeedRoundAction = {
    actionId: string;
    questionIndex: number;
    optionToken: string | null;
    timeout: boolean;
};

function toDeadlineDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Convert a server deadline into a local presentation deadline. This avoids a
 * browser whose wall clock is ahead immediately declaring a server round over.
 */
function toClientDeadline(
    deadlineAt: Date | string | null | undefined,
    serverNow: Date | string | null | undefined,
    requestStartedAt: number,
): Date | null {
    const deadline = toDeadlineDate(deadlineAt);
    const serverTime = toDeadlineDate(serverNow);
    if (!deadline || !serverTime) return deadline;

    const responseReceivedAt = Date.now();
    // Subtract the whole request round trip rather than trusting a local wall
    // clock. This is intentionally conservative: the display can finish a
    // little early, but it will not show time the server has already denied.
    const requestDuration = Math.max(0, responseReceivedAt - requestStartedAt);
    const remaining = Math.max(0, deadline.getTime() - serverTime.getTime() - requestDuration);
    return new Date(responseReceivedAt + remaining);
}

/** A duplicate action ID makes this one immediate retry safe to replay. */
async function retryIdempotentAction<T>(request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch {
        return request();
    }
}

function getRemainingSeconds(deadlineAt: Date | null): number {
    if (!deadlineAt) return 0;
    return Math.max(0, Math.ceil((deadlineAt.getTime() - Date.now()) / 1000));
}

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
                <p>{result?.correctMeaning || question.correctMeaning}</p>
            </div>
            {question.wordId ? (
                <button
                    type="button"
                    className={styles.saveButton}
                    onClick={() => saveWordMutation.mutate({ wordId: question.wordId! })}
                    disabled={!session || saveWordMutation.isPending}
                >
                    <Heart aria-hidden="true" className={isSaved ? styles.savedHeart : undefined} />
                    {isSaved ? play("saved") : session ? play("save") : play("signInToSave")}
                </button>
            ) : null}
        </article>
    );
}

function toGuestQuestion(question: GuestQuestionPayload): Question {
    const options = question.options.map((text, index) => ({
        token: `${question.id}-${index}`,
        text,
    }));

    return {
        token: `guest-${question.id}`,
        word: question.word,
        wordId: question.id,
        correctMeaning: question.correctMeaning,
        correctOptionToken: options.find((option) => option.text === question.correctMeaning)?.token,
        options,
    };
}

function toRatedQuestion(question: { token: string; word: string; options: readonly { token: string; text: string }[] }): Question {
    return {
        token: question.token,
        word: question.word,
        options: question.options.map((option) => ({ ...option })),
    };
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
    const [completedQuestions, setCompletedQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [ratedSessionId, setRatedSessionId] = useState<string | null>(null);
    const [ratedQuestionIndex, setRatedQuestionIndex] = useState(0);
    const [ratedQuestionCount, setRatedQuestionCount] = useState(0);
    const [serverDeadlineAt, setServerDeadlineAt] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState(timePerQuestion);
    const [results, setResults] = useState<AnswerResult[]>([]);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [officialScore, setOfficialScore] = useState(0);
    const [officialCorrectCount, setOfficialCorrectCount] = useState(0);
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [revealedCorrectToken, setRevealedCorrectToken] = useState<string | null>(null);
    const [isAnswerPending, setIsAnswerPending] = useState(false);
    const [isReplayingAction, setIsReplayingAction] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [userRank, setUserRank] = useState<number | null>(null);
    const answerLockRef = useRef(false);
    const advanceTimerRef = useRef<number | null>(null);
    const roundGenerationRef = useRef(0);
    const pendingActionRef = useRef<PendingSpeedRoundAction | null>(null);
    const replayInFlightRef = useRef(false);

    const { refetch: loadGuestRound } = api.game.getWordsForSpeedRound.useQuery(
        { questionCount, source },
        { enabled: false },
    );
    const startRatedRound = api.game.startSpeedRoundSession.useMutation();
    const answerRatedRound = api.game.answerSpeedRoundSession.useMutation();
    const { data: leaderboardData, refetch: refetchLeaderboard } = api.game.getLeaderboard.useQuery(
        { gameType: "speed_round", limit: 10 },
        { enabled: gameState === "finished" },
    );

    const clearAdvanceTimer = useCallback(() => {
        if (advanceTimerRef.current !== null) {
            window.clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
        }
    }, []);

    useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

    const resetRound = useCallback(() => {
        roundGenerationRef.current += 1;
        clearAdvanceTimer();
        answerLockRef.current = false;
        pendingActionRef.current = null;
        replayInFlightRef.current = false;
        setQuestions([]);
        setCompletedQuestions([]);
        setCurrentIndex(0);
        setRatedSessionId(null);
        setRatedQuestionIndex(0);
        setRatedQuestionCount(0);
        setServerDeadlineAt(null);
        setTimeLeft(timePerQuestion);
        setResults([]);
        setStreak(0);
        setMaxStreak(0);
        setOfficialScore(0);
        setOfficialCorrectCount(0);
        setFeedback(null);
        setSelectedAnswer(null);
        setRevealedCorrectToken(null);
        setIsAnswerPending(false);
        setIsReplayingAction(false);
        setUserRank(null);
    }, [clearAdvanceTimer, timePerQuestion]);

    const startGame = useCallback(async () => {
        resetRound();
        const roundGeneration = roundGenerationRef.current;
        setLoadError(null);
        setGameState("loading");

        try {
            if (session?.user?.id) {
                const requestStartedAt = Date.now();
                const result = await startRatedRound.mutateAsync({ questionCount, timePerQuestion, source });
                if (roundGeneration !== roundGenerationRef.current) return;
                if (result.sessionId && result.question) {
                    setRatedSessionId(result.sessionId);
                    setRatedQuestionCount(result.questionCount);
                    setQuestions([toRatedQuestion(result.question)]);
                    const deadlineAt = toClientDeadline(result.deadlineAt, result.serverNow, requestStartedAt);
                    setServerDeadlineAt(deadlineAt);
                    setTimeLeft(getRemainingSeconds(deadlineAt));
                    setGameState("playing");
                    return;
                }

                setLoadError(result.error === "noSavedWords" ? play("noSavedWords") : play("noWords"));
            } else {
                const result = await loadGuestRound();
                if (roundGeneration !== roundGenerationRef.current) return;
                const loadedQuestions = result.data?.questions as GuestQuestionPayload[] | undefined;
                if (loadedQuestions?.length) {
                    setQuestions(loadedQuestions.map(toGuestQuestion));
                    setTimeLeft(timePerQuestion);
                    setGameState("playing");
                    return;
                }

                setLoadError(result.data?.error === "noSavedWords" ? play("noSavedWords") : play("noWords"));
            }
        } catch {
            if (roundGeneration !== roundGenerationRef.current) return;
            setLoadError(play("noWords"));
        }

        if (roundGeneration !== roundGenerationRef.current) return;
        setGameState("setup");
    }, [loadGuestRound, play, questionCount, resetRound, session?.user?.id, source, startRatedRound, timePerQuestion]);

    const finishRatedRound = useCallback((rank: number | null | undefined) => {
        answerLockRef.current = false;
        setIsAnswerPending(false);
        setUserRank(rank ?? null);
        setGameState("finished");
        void refetchLeaderboard();
    }, [refetchLeaderboard]);

    const answerQuestion = useCallback(async (
        optionToken: string | null,
        remainingTime = timeLeft,
        isTimeout = false,
        replayAction?: PendingSpeedRoundAction,
    ) => {
        const currentQuestion = questions[currentIndex];
        const isReplaying = replayAction !== undefined;
        if (!currentQuestion || feedback !== null
            || (!isReplaying && (answerLockRef.current || isAnswerPending))
            || (isReplaying && replayInFlightRef.current)) return;

        if (isReplaying) {
            replayInFlightRef.current = true;
        } else {
            answerLockRef.current = true;
            setIsAnswerPending(true);
            setSelectedAnswer(optionToken);
        }
        const roundGeneration = roundGenerationRef.current;

        if (ratedSessionId) {
            const action = replayAction ?? {
                actionId: crypto.randomUUID(),
                questionIndex: ratedQuestionIndex,
                optionToken,
                timeout: isTimeout,
            };
            pendingActionRef.current = action;

            try {
                let requestStartedAt = Date.now();
                const outcome = await retryIdempotentAction(() => {
                    requestStartedAt = Date.now();
                    return answerRatedRound.mutateAsync({
                        sessionId: ratedSessionId,
                        actionId: action.actionId,
                        questionIndex: action.questionIndex,
                        optionToken: action.optionToken,
                        timeout: action.timeout,
                    });
                });
                if (roundGeneration !== roundGenerationRef.current) return;
                if (pendingActionRef.current?.actionId === action.actionId) pendingActionRef.current = null;
                setIsReplayingAction(false);

                if (outcome.timeoutNotReady) {
                    // Our display deadline is intentionally conservative. If it
                    // reaches zero before the persisted deadline, resume from
                    // the server's authoritative clock instead of leaving the
                    // choices locked while an idempotent retry waits.
                    const deadlineAt = toClientDeadline(
                        outcome.nextDeadlineAt,
                        outcome.serverNow,
                        requestStartedAt,
                    );
                    answerLockRef.current = false;
                    setIsAnswerPending(false);
                    setServerDeadlineAt(deadlineAt);
                    setTimeLeft(getRemainingSeconds(deadlineAt));
                    return;
                }

                if (outcome.expired) {
                    setServerDeadlineAt(null);
                    finishRatedRound(null);
                    return;
                }

                const nextDeadlineAt = outcome.nextQuestion
                    ? toClientDeadline(outcome.nextDeadlineAt, outcome.serverNow, requestStartedAt)
                    : null;

                const isCorrect = outcome.isCorrect ?? false;
                const result: AnswerResult = {
                    questionToken: currentQuestion.token,
                    isCorrect,
                    timeSpent: Math.round(((outcome.timeSpentMs ?? 0) / 1000) * 10) / 10,
                    pointsEarned: outcome.pointsEarned ?? 0,
                    correctMeaning: outcome.correctMeaning ?? undefined,
                };
                const resolvedQuestion = {
                    ...currentQuestion,
                    wordId: outcome.wordId ?? undefined,
                    correctMeaning: outcome.correctMeaning ?? undefined,
                    correctOptionToken: outcome.correctOptionToken ?? undefined,
                };

                setResults((current) => [...current, result]);
                setCompletedQuestions((current) => [...current, resolvedQuestion]);
                setStreak(outcome.streak ?? 0);
                setMaxStreak(outcome.maxStreak ?? 0);
                setOfficialScore(outcome.score ?? 0);
                setOfficialCorrectCount(outcome.correctCount ?? 0);
                setRevealedCorrectToken(outcome.correctOptionToken ?? null);
                setIsAnswerPending(false);
                setFeedback(isCorrect ? "correct" : "incorrect");

                advanceTimerRef.current = window.setTimeout(() => {
                    if (roundGeneration !== roundGenerationRef.current) return;
                    answerLockRef.current = false;
                    setFeedback(null);
                    setSelectedAnswer(null);
                    setRevealedCorrectToken(null);

                    if (outcome.completed) {
                        setServerDeadlineAt(null);
                        finishRatedRound(outcome.rank);
                        return;
                    }

                    if (outcome.nextQuestion) {
                        setQuestions([toRatedQuestion(outcome.nextQuestion)]);
                        setCurrentIndex(0);
                        setRatedQuestionIndex((index) => index + 1);
                        setServerDeadlineAt(nextDeadlineAt);
                        setTimeLeft(getRemainingSeconds(nextDeadlineAt));
                    }
                // Rated sessions reserve this same server-side transition gap
                // before their next question becomes answerable.
                }, ratedSessionId ? 720 : shouldReduceMotion ? 0 : 720);
            } catch {
                if (roundGeneration !== roundGenerationRef.current) return;
                // Keep the original action ID and board state. If the server
                // committed before the response was lost, replaying it returns
                // the stored event rather than scoring a second time.
                setIsReplayingAction(true);
            } finally {
                if (isReplaying) replayInFlightRef.current = false;
            }
            return;
        }

        const isCorrect = optionToken === currentQuestion.correctOptionToken;
        const timeSpent = Math.max(0, timePerQuestion - remainingTime);
        const speedBonus = isCorrect ? Math.round((remainingTime / timePerQuestion) * 50) : 0;
        const streakMultiplier = isCorrect ? Math.min(streak + 1, 5) : 0;
        const pointsEarned = isCorrect ? (100 + speedBonus) * streakMultiplier : 0;
        const nextStreak = isCorrect ? streak + 1 : 0;

        setStreak(nextStreak);
        setMaxStreak((current) => Math.max(current, nextStreak));
        setResults((current) => [...current, {
            questionToken: currentQuestion.token,
            isCorrect,
            timeSpent,
            pointsEarned,
            correctMeaning: currentQuestion.correctMeaning,
        }]);
        setCompletedQuestions((current) => [...current, currentQuestion]);
        setRevealedCorrectToken(currentQuestion.correctOptionToken ?? null);
        setIsAnswerPending(false);
        setFeedback(isCorrect ? "correct" : "incorrect");

        advanceTimerRef.current = window.setTimeout(() => {
            if (roundGeneration !== roundGenerationRef.current) return;
            answerLockRef.current = false;
            setFeedback(null);
            setSelectedAnswer(null);
            setRevealedCorrectToken(null);

            if (currentIndex < questions.length - 1) {
                setCurrentIndex((index) => index + 1);
                setTimeLeft(timePerQuestion);
                return;
            }

            setGameState("finished");
        }, shouldReduceMotion ? 0 : 720);
    }, [answerRatedRound, currentIndex, feedback, finishRatedRound, isAnswerPending, questions, ratedQuestionIndex, ratedSessionId, shouldReduceMotion, streak, timeLeft, timePerQuestion]);

    const replayPendingAnswer = useCallback(() => {
        const action = pendingActionRef.current;
        if (!action) return;
        void answerQuestion(action.optionToken, 0, action.timeout, action);
    }, [answerQuestion]);

    useEffect(() => {
        if (!isReplayingAction) return;
        const timer = window.setInterval(replayPendingAnswer, 1500);
        return () => window.clearInterval(timer);
    }, [isReplayingAction, replayPendingAnswer]);

    useEffect(() => {
        if (gameState !== "playing" || feedback !== null || isAnswerPending) return;
        const roundGeneration = roundGenerationRef.current;

        if (ratedSessionId && serverDeadlineAt) {
            const updateCountdown = () => {
                if (roundGeneration === roundGenerationRef.current) {
                    setTimeLeft(getRemainingSeconds(serverDeadlineAt));
                }
            };
            updateCountdown();
            const timer = window.setInterval(updateCountdown, 250);

            return () => window.clearInterval(timer);
        }

        const timer = window.setInterval(() => {
            if (roundGeneration === roundGenerationRef.current) {
                setTimeLeft((current) => Math.max(0, current - 1));
            }
        }, 1000);

        return () => window.clearInterval(timer);
    }, [feedback, gameState, isAnswerPending, ratedSessionId, serverDeadlineAt]);

    useEffect(() => {
        if (gameState === "playing" && feedback === null && !isAnswerPending && timeLeft === 0) {
            void answerQuestion(null, 0, ratedSessionId !== null);
        }
    }, [answerQuestion, feedback, gameState, isAnswerPending, ratedSessionId, timeLeft]);

    const stats = useMemo(() => {
        const guestScore = results.reduce((sum, result) => sum + result.pointsEarned, 0);
        const guestCorrectCount = results.filter((result) => result.isCorrect).length;
        const correctCount = ratedSessionId ? officialCorrectCount : guestCorrectCount;
        const totalScore = ratedSessionId ? officialScore : guestScore;
        const accuracy = results.length ? Math.round((correctCount / results.length) * 100) : 0;
        const averageTime = results.length
            ? Math.round((results.reduce((sum, result) => sum + result.timeSpent, 0) / results.length) * 10) / 10
            : 0;

        return { totalScore, correctCount, accuracy, averageTime };
    }, [officialCorrectCount, officialScore, ratedSessionId, results]);

    const currentQuestion = questions[currentIndex];
    const currentQuestionNumber = ratedSessionId ? ratedQuestionIndex + 1 : currentIndex + 1;
    const totalQuestions = ratedSessionId ? ratedQuestionCount : questions.length;

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
                            {!session && <p className={styles.hint}>{play("unrankedPractice")}</p>}
                            {loadError && <p className={styles.errorHint} role="alert">{loadError}</p>}
                        </fieldset>

                        <button className={styles.primaryAction} type="submit" disabled={startRatedRound.isPending}>{t("startGame")} <Zap aria-hidden="true" /></button>
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

                {ratedSessionId && userRank !== null && (
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
                        {completedQuestions.map((question, index) => <ReviewItem key={question.token} question={question} result={results[index]} session={session} />)}
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

            <div className={styles.roundProgress} aria-label={`${currentQuestionNumber}/${totalQuestions}`}>
                <span>{currentQuestionNumber}/{totalQuestions}</span>
                <i><b style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }} /></i>
            </div>

            {currentQuestion && (
                <motion.div
                    key={currentQuestion.token}
                    className={styles.sprintBoard}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                >
                    <p>{t("whatMeans")}</p>
                    <h2>{currentQuestion.word}</h2>
                    <div className={styles.answerGrid}>
                        {currentQuestion.options.map((option, index) => {
                            const isCorrect = option.token === revealedCorrectToken;
                            const isSelected = option.token === selectedAnswer;
                            const feedbackClass = feedback && (isCorrect || isSelected)
                                ? isCorrect ? styles.correctAnswer : styles.incorrectAnswer
                                : "";

                            return (
                                <motion.button
                                    type="button"
                                    key={option.token}
                                    className={`${styles.answerButton} ${feedbackClass}`}
                                    onClick={() => void answerQuestion(option.token)}
                                    disabled={feedback !== null || isAnswerPending}
                                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.045, duration: 0.18 }}
                                >
                                    <span>{String.fromCharCode(65 + index)}</span>
                                    {option.text}
                                    {feedback && isCorrect ? <Check aria-hidden="true" /> : null}
                                    {feedback && isSelected && !isCorrect ? <X aria-hidden="true" /> : null}
                                </motion.button>
                            );
                        })}
                    </div>
                    <p className={styles.bonusLine}><Zap aria-hidden="true" /> {t("fasterBonus")}</p>
                    {isReplayingAction ? <p className={styles.loadingLabel} role="status">{play("syncingAction")}</p> : null}
                </motion.div>
            )}
        </section>
    );
}
