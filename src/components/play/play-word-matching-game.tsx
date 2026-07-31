"use client";

import type { Session } from "@/src/lib/auth-client";
import { shuffleArray } from "@/src/lib/game";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleHelp, Clock3, Heart, Link2, RotateCcw, Sparkles, Timer, Trophy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./play-word-matching-game.module.css";

interface PlayWordMatchingGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

interface WordTile {
    token: string;
    word: string;
    /** Guest-only pairing marker; signed-in boards keep this server-side. */
    pairId?: string;
}

interface MeaningTile {
    token: string;
    meaning: string;
    /** Guest-only pairing marker; signed-in boards keep this server-side. */
    pairId?: string;
}

interface GuestMatchPair {
    id: number;
    word: string;
    meaning: string;
}

interface ReviewPair {
    wordId: number;
    word: string;
    meaning: string;
    matched: boolean;
    mistakeCount: number;
}

type GameMode = "relaxed" | "timed";
type GameState = "setup" | "loading" | "ready" | "playing" | "finished";

type PendingWordMatchingAction = {
    actionId: string;
    wordToken: string;
    meaningToken: string;
};

function toDeadlineDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** Keep the presentation timer independent of a browser clock offset. */
function toClientDeadline(
    deadlineAt: Date | string | null | undefined,
    serverNow: Date | string | null | undefined,
    requestStartedAt: number,
): Date | null {
    const deadline = toDeadlineDate(deadlineAt);
    const serverTime = toDeadlineDate(serverNow);
    if (!deadline || !serverTime) return deadline;

    const responseReceivedAt = Date.now();
    const requestDuration = Math.max(0, responseReceivedAt - requestStartedAt);
    const remaining = Math.max(0, deadline.getTime() - serverTime.getTime() - requestDuration);
    return new Date(responseReceivedAt + remaining);
}

/** Do not charge outbound request time that occurred before server activation. */
function toActivationClientDeadline(
    deadlineAt: Date | string | null | undefined,
    serverNow: Date | string | null | undefined,
): Date | null {
    const deadline = toDeadlineDate(deadlineAt);
    const serverTime = toDeadlineDate(serverNow);
    if (!deadline || !serverTime) return deadline;
    return new Date(Date.now() + Math.max(0, deadline.getTime() - serverTime.getTime()));
}

/** The server records an action by ID, so one transport retry cannot double-score. */
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

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ChoiceButton({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" className={`${styles.controlButton} ${className || ""}`} {...props}>{children}</button>;
}

function ReviewPairItem({ pair, session }: { pair: ReviewPair; session: Session | null }) {
    const play = useTranslations("Play.wordMatching");
    const [isSaveRequested, setIsSaveRequested] = useState(false);
    const utils = api.useUtils();
    const savedWordsQuery = api.user.getWordSaveStatus.useQuery(pair.wordId, {
        enabled: Boolean(session),
    });
    const saveWordMutation = api.user.saveWord.useMutation({
        onMutate: async ({ wordId }) => {
            await utils.user.getWordSaveStatus.cancel(wordId);
            const previousValue = utils.user.getWordSaveStatus.getData(wordId);
            utils.user.getWordSaveStatus.setData(wordId, !previousValue);
            return { previousValue };
        },
        onError: (_error, { wordId }, context) => {
            utils.user.getWordSaveStatus.setData(wordId, context?.previousValue);
        },
        onSuccess: (saved, { wordId }) => {
            utils.user.getWordSaveStatus.setData(wordId, saved);
        },
        onSettled: (_saved, _error, { wordId }) => {
            setIsSaveRequested(false);
            void utils.user.getWordSaveStatus.invalidate(wordId);
        },
    });
    const isSaved = savedWordsQuery.data === true;
    const status = pair.mistakeCount > 0 ? "mistake" : pair.matched ? "correct" : "unmatched";
    const statusClass = status === "mistake"
        ? styles.reviewMistake
        : status === "correct"
            ? styles.reviewCorrect
            : styles.reviewUnmatched;

    const saveWord = () => {
        if (
            !session
            || savedWordsQuery.isLoading
            || savedWordsQuery.isError
            || isSaveRequested
            || saveWordMutation.isPending
        ) return;
        setIsSaveRequested(true);
        saveWordMutation.mutate({ wordId: pair.wordId });
    };

    return (
        <article className={`${styles.reviewItem} ${statusClass}`}>
            <span className={styles.reviewStatus}>
                {status === "correct" ? <Check aria-hidden="true" /> : status === "mistake" ? <X aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
            </span>
            <div>
                <Link
                    href={{ pathname: "/search/[word]", params: { word: pair.word } }}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {pair.word}
                </Link>
                <p>{pair.meaning}</p>
                <small>
                    {status === "mistake"
                        ? play("mistakeCount", { count: pair.mistakeCount })
                        : status === "correct"
                            ? play("correctPair")
                            : play("unmatchedPair")}
                </small>
            </div>
            <button
                type="button"
                className={styles.saveButton}
                onClick={saveWord}
                disabled={
                    !session
                    || savedWordsQuery.isLoading
                    || savedWordsQuery.isError
                    || isSaveRequested
                    || saveWordMutation.isPending
                }
            >
                <Heart aria-hidden="true" className={isSaved ? styles.savedHeart : undefined} />
                {isSaved ? play("saved") : session ? play("save") : play("signInToSave")}
            </button>
        </article>
    );
}

export default function PlayWordMatchingGame({ session }: PlayWordMatchingGameProps) {
    const t = useTranslations("WordMatchingGame");
    const play = useTranslations("Play.wordMatching");
    const shouldReduceMotion = useReducedMotion();
    const [pairCount, setPairCount] = useState(6);
    const [source, setSource] = useState<"all" | "saved">("all");
    const [gameMode, setGameMode] = useState<GameMode>("relaxed");
    const [gameState, setGameState] = useState<GameState>("setup");
    const [wordItems, setWordItems] = useState<WordTile[]>([]);
    const [meaningItems, setMeaningItems] = useState<MeaningTile[]>([]);
    const [guestPairs, setGuestPairs] = useState<GuestMatchPair[]>([]);
    const [guestMistakeCounts, setGuestMistakeCounts] = useState<Map<string, number>>(new Map());
    const [ratedReviewPairs, setRatedReviewPairs] = useState<ReviewPair[]>([]);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
    const [matchedWordTokens, setMatchedWordTokens] = useState<Set<string>>(new Set());
    const [matchedMeaningTokens, setMatchedMeaningTokens] = useState<Set<string>>(new Set());
    const [mismatch, setMismatch] = useState<{ wordToken: string; meaningToken: string } | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [officialScore, setOfficialScore] = useState(0);
    const [officialTime, setOfficialTime] = useState<number | null>(null);
    const [ratedSessionId, setRatedSessionId] = useState<string | null>(null);
    const [serverDeadlineAt, setServerDeadlineAt] = useState<Date | null>(null);
    const [isAttemptPending, setIsAttemptPending] = useState(false);
    const [isReplayingAction, setIsReplayingAction] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const roundGenerationRef = useRef(0);
    const activationSessionRef = useRef<string | null>(null);
    const timeoutActionIdRef = useRef<string | null>(null);
    const timeoutSettlingRef = useRef(false);
    const pendingActionRef = useRef<PendingWordMatchingAction | null>(null);
    const replayInFlightRef = useRef(false);

    const { refetch: loadGuestRound } = api.game.getWordsForMatching.useQuery(
        { pairCount, source },
        { enabled: false },
    );
    const startRatedRound = api.game.startWordMatchingSession.useMutation();
    const activateRatedRound = api.game.activateGameSession.useMutation();
    const attemptRatedMatch = api.game.attemptWordMatchingSession.useMutation();

    const resetRound = useCallback(() => {
        roundGenerationRef.current += 1;
        activationSessionRef.current = null;
        timeoutActionIdRef.current = null;
        timeoutSettlingRef.current = false;
        pendingActionRef.current = null;
        replayInFlightRef.current = false;
        setWordItems([]);
        setMeaningItems([]);
        setGuestPairs([]);
        setGuestMistakeCounts(new Map());
        setRatedReviewPairs([]);
        setSelectedWord(null);
        setSelectedMeaning(null);
        setMatchedWordTokens(new Set());
        setMatchedMeaningTokens(new Set());
        setMismatch(null);
        setMistakes(0);
        setOfficialScore(0);
        setOfficialTime(null);
        setRatedSessionId(null);
        setServerDeadlineAt(null);
        setIsAttemptPending(false);
        setIsReplayingAction(false);
        setTimeLeft(60);
        setElapsedTime(0);
    }, []);

    const prepareGuestRound = useCallback((pairs: GuestMatchPair[]) => {
        const words = pairs.map((pair) => ({
            token: `guest-word-${pair.id}`,
            word: pair.word,
            pairId: String(pair.id),
        }));
        const meanings = shuffleArray(pairs.map((pair) => ({
            token: `guest-meaning-${pair.id}`,
            meaning: pair.meaning,
            pairId: String(pair.id),
        })));

        setWordItems(words);
        setMeaningItems(meanings);
        setGuestPairs(pairs);
        setGameState("playing");
    }, []);

    const startGame = useCallback(async () => {
        resetRound();
        const roundGeneration = roundGenerationRef.current;
        setGameState("loading");
        setLoadError(null);

        try {
            if (session?.user?.id) {
                const result = await startRatedRound.mutateAsync({ pairCount, source, mode: gameMode });
                if (roundGeneration !== roundGenerationRef.current) return;
                if (result.sessionId && result.board) {
                    setRatedSessionId(result.sessionId);
                    setWordItems(result.board.words.map((tile) => ({ token: tile.token, word: tile.word })));
                    setMeaningItems(result.board.meanings.map((tile) => ({ token: tile.token, meaning: tile.meaning })));
                    setGameState("ready");
                    return;
                }

                setLoadError(result.error === "noSavedWords" ? play("noSavedWords") : play("noWords"));
            } else {
                const result = await loadGuestRound();
                if (roundGeneration !== roundGenerationRef.current) return;
                const pairs = result.data?.pairs as GuestMatchPair[] | undefined;
                if (pairs?.length) {
                    prepareGuestRound(pairs);
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
    }, [gameMode, loadGuestRound, pairCount, play, prepareGuestRound, resetRound, session?.user?.id, source, startRatedRound]);

    useEffect(() => {
        if (gameState !== "ready" || !ratedSessionId) return;
        if (activationSessionRef.current === ratedSessionId) return;
        activationSessionRef.current = ratedSessionId;

        const roundGeneration = roundGenerationRef.current;
        const activate = async () => {
            try {
                const result = await retryIdempotentAction(
                    () => activateRatedRound.mutateAsync({ sessionId: ratedSessionId }),
                );
                if (roundGeneration !== roundGenerationRef.current) return;

                const deadlineAt = toActivationClientDeadline(result.deadlineAt, result.serverNow);
                if (gameMode === "timed" && !deadlineAt) {
                    throw new Error("Timed Word Matching activation returned no deadline");
                }
                setServerDeadlineAt(deadlineAt);
                setTimeLeft(deadlineAt ? getRemainingSeconds(deadlineAt) : 60);
                setElapsedTime(0);
                setGameState("playing");
            } catch {
                if (roundGeneration !== roundGenerationRef.current) return;
                resetRound();
                setLoadError(play("activationError"));
                setGameState("setup");
            }
        };

        void activate();
    }, [activateRatedRound, gameMode, gameState, play, ratedSessionId, resetRound]);

    const restartSetup = useCallback(() => {
        resetRound();
        setGameState("setup");
        setLoadError(null);
    }, [resetRound]);

    const finishRatedRound = useCallback((timeTakenSeconds: number | undefined) => {
        setOfficialTime(timeTakenSeconds ?? null);
        setIsAttemptPending(false);
        setGameState("finished");
    }, []);

    const settleTimedOutRound = useCallback(async () => {
        if (!ratedSessionId || timeoutSettlingRef.current) return;

        timeoutSettlingRef.current = true;
        const roundGeneration = roundGenerationRef.current;
        const actionId = timeoutActionIdRef.current ?? crypto.randomUUID();
        timeoutActionIdRef.current = actionId;
        setIsAttemptPending(true);
        setSelectedWord(null);
        setSelectedMeaning(null);

        try {
            const outcome = await retryIdempotentAction(() => attemptRatedMatch.mutateAsync({
                sessionId: ratedSessionId,
                actionId,
                wordTileToken: null,
                meaningTileToken: null,
            }));
            if (roundGeneration !== roundGenerationRef.current) return;

            timeoutActionIdRef.current = null;
            setServerDeadlineAt(null);
            setMistakes(outcome.mistakes ?? 0);
            setOfficialScore(outcome.score ?? 0);
            setMatchedWordTokens(new Set(outcome.matchedWordTokens ?? []));
            setMatchedMeaningTokens(new Set(outcome.matchedMeaningTokens ?? []));
            setRatedReviewPairs((outcome.review ?? []).map((pair) => ({ ...pair })));
            finishRatedRound(outcome.timeTakenSeconds ?? outcome.finalResult?.timeTakenSeconds);
        } catch {
            if (roundGeneration !== roundGenerationRef.current) return;

            // If the server is a fraction behind the presentation clock, keep
            // the board alive and replay the same idempotent timeout action.
            timeoutSettlingRef.current = false;
            setIsAttemptPending(false);
            setServerDeadlineAt(new Date(Date.now() + 1000));
            setTimeLeft(1);
        }
    }, [attemptRatedMatch, finishRatedRound, ratedSessionId]);

    const resolveMatch = useCallback(async (
        wordToken: string,
        meaningToken: string,
        replayAction?: PendingWordMatchingAction,
    ) => {
        const isReplaying = replayAction !== undefined;
        if ((isAttemptPending && !isReplaying) || (isReplaying && replayInFlightRef.current)) return;

        const selectedWordItem = wordItems.find((item) => item.token === wordToken);
        const selectedMeaningItem = meaningItems.find((item) => item.token === meaningToken);
        if (!selectedWordItem || !selectedMeaningItem) return;

        if (isReplaying) {
            replayInFlightRef.current = true;
        } else {
            setIsAttemptPending(true);
            setSelectedWord(null);
            setSelectedMeaning(null);
        }
        const roundGeneration = roundGenerationRef.current;

        if (ratedSessionId) {
            const action = replayAction ?? {
                actionId: crypto.randomUUID(),
                wordToken,
                meaningToken,
            };
            pendingActionRef.current = action;

            try {
                const outcome = await retryIdempotentAction(() => attemptRatedMatch.mutateAsync({
                    sessionId: ratedSessionId,
                    actionId: action.actionId,
                    wordTileToken: action.wordToken,
                    meaningTileToken: action.meaningToken,
                }));
                if (roundGeneration !== roundGenerationRef.current) return;
                if (pendingActionRef.current?.actionId === action.actionId) pendingActionRef.current = null;
                setIsReplayingAction(false);

                if (outcome.expired) {
                    setServerDeadlineAt(null);
                    setMistakes(outcome.mistakes ?? 0);
                    setOfficialScore(outcome.score ?? 0);
                    setMatchedWordTokens(new Set(outcome.matchedWordTokens ?? []));
                    setMatchedMeaningTokens(new Set(outcome.matchedMeaningTokens ?? []));
                    setRatedReviewPairs((outcome.review ?? []).map((pair) => ({ ...pair })));
                    finishRatedRound(outcome.timeTakenSeconds ?? undefined);
                    return;
                }

                setMistakes(outcome.mistakes ?? 0);
                setOfficialScore(outcome.score ?? 0);
                setMatchedWordTokens(new Set(outcome.matchedWordTokens ?? []));
                setMatchedMeaningTokens(new Set(outcome.matchedMeaningTokens ?? []));

                if (!outcome.isCorrect) {
                    setMismatch({ wordToken, meaningToken });
                    window.setTimeout(() => {
                        if (roundGeneration === roundGenerationRef.current) setMismatch(null);
                    }, shouldReduceMotion ? 0 : 480);
                }

                setIsAttemptPending(false);
                if (outcome.completed) {
                    setRatedReviewPairs((outcome.review ?? []).map((pair) => ({ ...pair })));
                    finishRatedRound(outcome.timeTakenSeconds ?? outcome.finalResult?.timeTakenSeconds);
                }
            } catch {
                if (roundGeneration !== roundGenerationRef.current) return;
                // Preserve the opaque action and board. A later replay of the
                // same ID either returns its recorded outcome or safely retries.
                setIsReplayingAction(true);
            } finally {
                if (isReplaying) replayInFlightRef.current = false;
            }
            return;
        }

        const isCorrect = selectedWordItem.pairId === selectedMeaningItem.pairId;
        if (isCorrect) {
            setMatchedWordTokens((current) => new Set(current).add(wordToken));
            setMatchedMeaningTokens((current) => new Set(current).add(meaningToken));
        } else {
            setMistakes((current) => current + 1);
            setGuestMistakeCounts((current) => {
                const next = new Map(current);
                for (const pairId of new Set([selectedWordItem.pairId, selectedMeaningItem.pairId])) {
                    if (!pairId) continue;
                    next.set(pairId, (next.get(pairId) ?? 0) + 1);
                }
                return next;
            });
            setMismatch({ wordToken, meaningToken });
            window.setTimeout(() => {
                if (roundGeneration === roundGenerationRef.current) setMismatch(null);
            }, shouldReduceMotion ? 0 : 480);
        }
        setIsAttemptPending(false);
    }, [attemptRatedMatch, finishRatedRound, isAttemptPending, meaningItems, ratedSessionId, shouldReduceMotion, wordItems]);

    const replayPendingMatch = useCallback(() => {
        const action = pendingActionRef.current;
        if (!action) return;
        void resolveMatch(action.wordToken, action.meaningToken, action);
    }, [resolveMatch]);

    useEffect(() => {
        if (!isReplayingAction) return;
        const timer = window.setInterval(replayPendingMatch, 1500);
        return () => window.clearInterval(timer);
    }, [isReplayingAction, replayPendingMatch]);

    const chooseWord = useCallback((token: string) => {
        if (matchedWordTokens.has(token) || isAttemptPending) return;

        if (selectedMeaning !== null) {
            void resolveMatch(token, selectedMeaning);
            return;
        }

        setSelectedWord(token);
    }, [isAttemptPending, matchedWordTokens, resolveMatch, selectedMeaning]);

    const chooseMeaning = useCallback((token: string) => {
        if (matchedMeaningTokens.has(token) || isAttemptPending) return;

        if (selectedWord !== null) {
            void resolveMatch(selectedWord, token);
            return;
        }

        setSelectedMeaning(token);
    }, [isAttemptPending, matchedMeaningTokens, resolveMatch, selectedWord]);

    useEffect(() => {
        if (gameState !== "playing") return;
        const roundGeneration = roundGenerationRef.current;

        if (gameMode === "timed" && ratedSessionId && serverDeadlineAt) {
            const updateCountdown = () => {
                if (roundGeneration === roundGenerationRef.current) {
                    const remaining = getRemainingSeconds(serverDeadlineAt);
                    setTimeLeft(remaining);
                    if (remaining === 0 && !isAttemptPending) void settleTimedOutRound();
                }
            };
            updateCountdown();
            const interval = window.setInterval(updateCountdown, 250);

            return () => window.clearInterval(interval);
        }

        const interval = window.setInterval(() => {
            if (roundGeneration !== roundGenerationRef.current) return;
            if (gameMode === "timed") {
                setTimeLeft((current) => {
                    if (current <= 1) {
                        setGameState("finished");
                        return 0;
                    }

                    return current - 1;
                });
            } else {
                setElapsedTime((current) => current + 1);
            }
        }, 1000);

        return () => window.clearInterval(interval);
    }, [gameMode, gameState, isAttemptPending, ratedSessionId, serverDeadlineAt, settleTimedOutRound]);

    useEffect(() => {
        if (!ratedSessionId && gameState === "playing" && wordItems.length > 0 && matchedWordTokens.size === wordItems.length) {
            setGameState("finished");
        }
    }, [gameState, matchedWordTokens.size, ratedSessionId, wordItems.length]);

    const score = useMemo(
        () => ratedSessionId ? officialScore : Math.max(0, matchedWordTokens.size * 100 - mistakes * 10),
        [matchedWordTokens.size, mistakes, officialScore, ratedSessionId],
    );
    const boardSize = wordItems.length || pairCount;
    const displayTime = officialTime ?? (gameMode === "timed" ? 60 - timeLeft : elapsedTime);
    const reviewPairs = useMemo(() => {
        if (ratedSessionId) return ratedReviewPairs;

        return guestPairs.map((pair) => {
            const pairId = String(pair.id);
            const wordTile = wordItems.find((item) => item.pairId === pairId);
            return {
                wordId: pair.id,
                word: pair.word,
                meaning: pair.meaning,
                matched: wordTile ? matchedWordTokens.has(wordTile.token) : false,
                mistakeCount: guestMistakeCounts.get(pairId) ?? 0,
            };
        });
    }, [guestMistakeCounts, guestPairs, matchedWordTokens, ratedReviewPairs, ratedSessionId, wordItems]);

    if (gameState === "setup") {
        return (
            <section className={styles.page} aria-labelledby="word-matching-title">
                <header className={styles.intro}>
                    <p className={styles.kicker}><Link2 aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="word-matching-title">{t("title")}</h1>
                    <p>{play("setupDescription")}</p>
                </header>

                <div className={styles.setupLayout}>
                    <form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); void startGame(); }}>
                        <fieldset>
                            <legend>{t("pairCount")}</legend>
                            <div className={styles.choiceGrid}>
                                {[4, 6, 8].map((count) => (
                                    <ChoiceButton key={count} className={pairCount === count ? styles.selected : ""} aria-pressed={pairCount === count} onClick={() => setPairCount(count)}>
                                        {count} {t("pairs")}
                                    </ChoiceButton>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>{t("mode")}</legend>
                            <div className={styles.choiceGrid}>
                                <ChoiceButton className={gameMode === "relaxed" ? styles.selected : ""} aria-pressed={gameMode === "relaxed"} onClick={() => setGameMode("relaxed")}>{t("relaxedMode")}</ChoiceButton>
                                <ChoiceButton className={gameMode === "timed" ? styles.selected : ""} aria-pressed={gameMode === "timed"} onClick={() => setGameMode("timed")}>{t("timedMode")}</ChoiceButton>
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

                        <button className={styles.primaryAction} type="submit" disabled={startRatedRound.isPending}>{t("startGame")} <Link2 aria-hidden="true" /></button>
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
            <section className={`${styles.page} ${styles.loadingPage}`} aria-labelledby="word-matching-title" aria-busy="true">
                <header className={styles.playHeader}>
                    <div>
                        <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundKicker")}</p>
                        <h1 id="word-matching-title">{t("title")}</h1>
                    </div>
                    <p className={styles.loadingLabel}>{t("loading")}</p>
                </header>
                <div className={styles.loadingBoard} aria-live="polite">
                    {["words", "meanings"].map((column) => (
                        <div key={column} className={styles.loadingColumn}>
                            <span className={styles.loadingHeading} />
                            {Array.from({ length: Math.min(pairCount, 4) }, (_, index) => <span key={index} className={styles.loadingRow} />)}
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (gameState === "finished") {
        const isWin = matchedWordTokens.size === wordItems.length;

        return (
            <section className={`${styles.page} ${styles.finished}`} aria-labelledby="finished-title">
                <p className={styles.kicker}><Trophy aria-hidden="true" /> {play("roundCompleteKicker")}</p>
                <h1 id="finished-title">{isWin ? t("congratulations") : t("timeUp")}</h1>
                <p>{isWin ? play("roundCompleteDescription") : play("timeUpDescription")}</p>
                {!session ? <p className={styles.unrankedResult}>{play("unrankedPractice")}</p> : null}
                <div className={styles.results}>
                    <span><b>{matchedWordTokens.size}/{boardSize}</b>{t("matchedPairs")}</span>
                    <span><b>{score}</b>{t("score")}</span>
                    <span><b>{mistakes}</b>{t("mistakes")}</span>
                    <span><b>{formatTime(displayTime)}</b>{t("time")}</span>
                </div>
                <div className={styles.finishedActions}>
                    <button type="button" className={styles.primaryAction} onClick={() => void startGame()}>{t("playAgain")} <RotateCcw aria-hidden="true" /></button>
                    <button type="button" className={styles.secondaryAction} onClick={restartSetup}>{t("settings")}</button>
                </div>
                {reviewPairs.length > 0 ? (
                    <section className={styles.review} aria-labelledby="word-matching-review-title">
                        <h2 id="word-matching-review-title"><CircleHelp aria-hidden="true" /> {play("review")}</h2>
                        <div>
                            {reviewPairs.map((pair) => <ReviewPairItem key={pair.wordId} pair={pair} session={session} />)}
                        </div>
                    </section>
                ) : null}
            </section>
        );
    }

    const isReady = gameState === "ready";

    return (
        <section className={styles.page} aria-labelledby="word-matching-title" aria-busy={isReady || undefined}>
            <header className={styles.playHeader}>
                <div>
                    <p className={styles.kicker}><Link2 aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="word-matching-title">{t("title")}</h1>
                </div>
                <div className={styles.scoreboard} aria-label={play("scoreboard")}>
                    <span><Check aria-hidden="true" /> {matchedWordTokens.size}/{boardSize}</span>
                    <span><X aria-hidden="true" /> {mistakes}</span>
                    <span><Timer aria-hidden="true" /> {formatTime(gameMode === "timed" ? timeLeft : elapsedTime)}</span>
                    <button type="button" onClick={restartSetup} aria-label={t("restart")}><RotateCcw aria-hidden="true" /></button>
                </div>
            </header>

            <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${(matchedWordTokens.size / boardSize) * 100}%` }} /></div>

            <div className={styles.matchBoard}>
                <div className={styles.matchColumn}>
                    <h2>{t("words")}</h2>
                    {wordItems.map((item, index) => {
                        const matched = matchedWordTokens.has(item.token);
                        const selected = selectedWord === item.token;
                        const incorrect = mismatch?.wordToken === item.token;

                        return (
                            <motion.button
                                type="button"
                                key={item.token}
                                className={`${styles.matchChoice} ${matched ? styles.matched : ""} ${selected ? styles.selectedChoice : ""} ${incorrect ? styles.incorrect : ""}`}
                                onClick={() => chooseWord(item.token)}
                                disabled={isReady || matched || isAttemptPending}
                                aria-pressed={selected}
                                initial={shouldReduceMotion ? false : { opacity: 0, x: -14 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.035, duration: 0.22 }}
                            >
                                <span className={styles.choiceMark}>{matched ? <Check aria-hidden="true" /> : index + 1}</span>
                                <strong>{item.word}</strong>
                            </motion.button>
                        );
                    })}
                </div>

                <div className={styles.matchColumn}>
                    <h2>{t("meanings")}</h2>
                    {meaningItems.map((item, index) => {
                        const matched = matchedMeaningTokens.has(item.token);
                        const selected = selectedMeaning === item.token;
                        const incorrect = mismatch?.meaningToken === item.token;

                        return (
                            <motion.button
                                type="button"
                                key={item.token}
                                className={`${styles.matchChoice} ${styles.meaningChoice} ${matched ? styles.matched : ""} ${selected ? styles.selectedChoice : ""} ${incorrect ? styles.incorrect : ""}`}
                                onClick={() => chooseMeaning(item.token)}
                                disabled={isReady || matched || isAttemptPending}
                                aria-pressed={selected}
                                initial={shouldReduceMotion ? false : { opacity: 0, x: 14 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.035, duration: 0.22 }}
                            >
                                <span className={styles.choiceMark}>{matched ? <Check aria-hidden="true" /> : String.fromCharCode(65 + index)}</span>
                                <span>{item.meaning}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <p className={styles.keyboardHint}><Clock3 aria-hidden="true" /> {t("instructions")}</p>
            {isReady ? <p className={styles.keyboardHint} role="status">{play("roundReady")}</p> : null}
            {isReplayingAction ? <p className={styles.keyboardHint} role="status">{play("syncingAction")}</p> : null}
        </section>
    );
}
