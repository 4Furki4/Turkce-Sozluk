"use client";

import type { Session } from "@/src/lib/auth-client";
import { shuffleArray } from "@/src/lib/game";
import { api } from "@/src/trpc/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Clock3, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./play-flashcard-game.module.css";

interface PlayFlashcardGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

type FlashcardDirection = "word" | "meaning";
type FlashcardRating = "again" | "hard" | "good" | "easy";
type DeckMode = "practice" | "due";
type GameState = "setup" | "loading" | "playing" | "finished";

interface FlashcardWord {
    id: number;
    meaningId: number;
    name: string;
    phonetic: string | null;
    meaning: string;
    partOfSpeech: string | null;
    /** Present only in a persisted due queue. */
    direction?: FlashcardDirection;
    dueAt?: Date | string;
}

interface PendingRatingAction {
    actionId: string;
    meaningId: number;
    direction: FlashcardDirection;
    rating: FlashcardRating;
}

function ControlButton({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" className={`${styles.controlButton} ${className || ""}`} {...props}>{children}</button>;
}

function startsOnMeaning(direction: FlashcardDirection): boolean {
    return direction === "meaning";
}

function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    const interactiveElement = target.closest("button, input, textarea, select, a, [role='button']");
    return Boolean(interactiveElement && !interactiveElement.hasAttribute("data-flashcard-trigger"));
}

/** A persisted action ID means this single immediate retry cannot reschedule a card twice. */
async function retryIdempotentAction<T>(request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch {
        return request();
    }
}

export default function PlayFlashcardGame({ session, locale }: PlayFlashcardGameProps) {
    const t = useTranslations("FlashcardGame");
    const play = useTranslations("Play.flashcards");
    const shouldReduceMotion = useReducedMotion();
    const utils = api.useUtils();
    const [cardCount, setCardCount] = useState(10);
    const [source, setSource] = useState<"all" | "saved">("all");
    const [defaultSide, setDefaultSide] = useState<FlashcardDirection>("word");
    const [gameState, setGameState] = useState<GameState>("setup");
    const [deckMode, setDeckMode] = useState<DeckMode>("practice");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [words, setWords] = useState<FlashcardWord[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [ratingError, setRatingError] = useState<string | null>(null);
    const [ratingStatus, setRatingStatus] = useState("");
    const [isRatingPending, setIsRatingPending] = useState(false);
    const [pendingRating, setPendingRating] = useState<PendingRatingAction | null>(null);
    const cardRef = useRef<HTMLButtonElement | null>(null);
    const focusNextCardRef = useRef(false);
    const pendingRatingRef = useRef<PendingRatingAction | null>(null);
    const navigationPendingRef = useRef(false);
    const roundGenerationRef = useRef(0);

    const isSignedIn = Boolean(session?.user?.id);
    const { refetch: loadPracticeDeck } = api.game.getRandomWordsForFlashcards.useQuery(
        { count: cardCount, source },
        { enabled: false },
    );
    const reviewSummary = api.game.getFlashcardReviewSummary.useQuery(undefined, {
        enabled: isSignedIn,
        retry: false,
    });
    const { refetch: loadDueDeck } = api.game.getDueFlashcardReviews.useQuery(
        { limit: cardCount },
        { enabled: false },
    );
    const rateReview = api.game.rateFlashcardReview.useMutation();

    const getCardDirection = useCallback((card: FlashcardWord): FlashcardDirection => (
        deckMode === "due" ? card.direction ?? defaultSide : defaultSide
    ), [deckMode, defaultSide]);

    const resetDeck = useCallback(() => {
        roundGenerationRef.current += 1;
        pendingRatingRef.current = null;
        navigationPendingRef.current = false;
        focusNextCardRef.current = false;
        setWords([]);
        setCurrentIndex(0);
        setIsFlipped(false);
        setRatingError(null);
        setRatingStatus("");
        setIsRatingPending(false);
        setPendingRating(null);
    }, []);

    const openDeck = useCallback((nextWords: FlashcardWord[], mode: DeckMode) => {
        navigationPendingRef.current = false;
        setDeckMode(mode);
        setWords(nextWords);
        setCurrentIndex(0);
        setIsFlipped(startsOnMeaning(mode === "due" ? nextWords[0]?.direction ?? defaultSide : defaultSide));
        setGameState("playing");
    }, [defaultSide]);

    const startPracticeDeck = useCallback(async () => {
        resetDeck();
        const generation = roundGenerationRef.current;
        setDeckMode("practice");
        setGameState("loading");
        setLoadError(null);

        try {
            const result = await loadPracticeDeck();
            if (generation !== roundGenerationRef.current) return;
            const nextWords = result.data?.words as FlashcardWord[] | undefined;
            if (nextWords?.length) {
                openDeck(nextWords, "practice");
                return;
            }

            setLoadError(result.data?.error === "noSavedWords" ? play("noSavedWords") : t("noWords"));
        } catch {
            if (generation !== roundGenerationRef.current) return;
            setLoadError(t("noWords"));
        }

        if (generation === roundGenerationRef.current) setGameState("setup");
    }, [loadPracticeDeck, openDeck, play, resetDeck, t]);

    const startDueDeck = useCallback(async () => {
        if (!isSignedIn) return;

        resetDeck();
        const generation = roundGenerationRef.current;
        setDeckMode("due");
        setGameState("loading");
        setLoadError(null);

        try {
            const result = await loadDueDeck();
            if (generation !== roundGenerationRef.current) return;
            if (result.error) {
                setLoadError(play("reviewLoadError"));
                setGameState("setup");
                return;
            }

            const dueCards = result.data?.cards as FlashcardWord[] | undefined;
            if (dueCards?.length) {
                openDeck(dueCards, "due");
                return;
            }

            await reviewSummary.refetch();
        } catch {
            if (generation !== roundGenerationRef.current) return;
            setLoadError(play("reviewLoadError"));
        }

        if (generation === roundGenerationRef.current) setGameState("setup");
    }, [isSignedIn, loadDueDeck, openDeck, play, resetDeck, reviewSummary]);

    const restartSetup = useCallback(() => {
        // Do not discard an unresolved idempotent action: its retry is the
        // only way to learn whether a lost response already scheduled a card.
        if (pendingRatingRef.current) return;

        resetDeck();
        setGameState("setup");
        setLoadError(null);
    }, [resetDeck]);

    const goNext = useCallback(() => {
        if (deckMode === "due" || isRatingPending || pendingRating || pendingRatingRef.current || navigationPendingRef.current) return;
        if (currentIndex >= words.length - 1) {
            setGameState("finished");
            return;
        }

        const generation = roundGenerationRef.current;
        const nextCard = words[currentIndex + 1];
        navigationPendingRef.current = true;
        focusNextCardRef.current = true;
        setIsFlipped(startsOnMeaning(getCardDirection(nextCard!)));
        window.setTimeout(() => {
            if (generation !== roundGenerationRef.current) return;
            setCurrentIndex((value) => Math.min(value + 1, words.length - 1));
            navigationPendingRef.current = false;
        }, shouldReduceMotion ? 0 : 110);
    }, [currentIndex, deckMode, getCardDirection, isRatingPending, pendingRating, shouldReduceMotion, words]);

    const goPrevious = useCallback(() => {
        if (deckMode === "due" || isRatingPending || pendingRating || pendingRatingRef.current || navigationPendingRef.current || currentIndex === 0) return;
        const generation = roundGenerationRef.current;
        const previousCard = words[currentIndex - 1];
        navigationPendingRef.current = true;
        setIsFlipped(startsOnMeaning(getCardDirection(previousCard!)));
        window.setTimeout(() => {
            if (generation !== roundGenerationRef.current) return;
            setCurrentIndex((value) => Math.max(value - 1, 0));
            navigationPendingRef.current = false;
        }, shouldReduceMotion ? 0 : 110);
    }, [currentIndex, deckMode, getCardDirection, isRatingPending, pendingRating, shouldReduceMotion, words]);

    const flipCard = useCallback(() => {
        if (!isRatingPending && !pendingRating && !pendingRatingRef.current && !navigationPendingRef.current) {
            setIsFlipped((value) => !value);
        }
    }, [isRatingPending, pendingRating]);

    const shuffleCards = useCallback(() => {
        if (deckMode === "due" || isRatingPending || pendingRating || pendingRatingRef.current || navigationPendingRef.current) return;
        const shuffled = shuffleArray(words);
        setWords(shuffled);
        setCurrentIndex(0);
        setIsFlipped(startsOnMeaning(getCardDirection(shuffled[0]!)));
    }, [deckMode, getCardDirection, isRatingPending, pendingRating, words]);

    const replay = useCallback(() => {
        if (deckMode === "due") {
            void startDueDeck();
            return;
        }

        setCurrentIndex(0);
        setIsFlipped(startsOnMeaning(defaultSide));
        setGameState("playing");
    }, [deckMode, defaultSide, startDueDeck]);

    const formatDueDate = useCallback((dueAt: Date | string) => {
        const date = dueAt instanceof Date ? dueAt : new Date(dueAt);
        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(date);
    }, [locale]);

    const advanceAfterRating = useCallback(() => {
        if (currentIndex >= words.length - 1) {
            setGameState("finished");
            void reviewSummary.refetch();
            return;
        }

        const nextCard = words[currentIndex + 1];
        const generation = roundGenerationRef.current;
        navigationPendingRef.current = true;
        focusNextCardRef.current = true;
        setIsFlipped(startsOnMeaning(getCardDirection(nextCard!)));
        window.setTimeout(() => {
            if (generation !== roundGenerationRef.current) return;
            setCurrentIndex((value) => Math.min(value + 1, words.length - 1));
            navigationPendingRef.current = false;
        }, shouldReduceMotion ? 0 : 110);
    }, [currentIndex, getCardDirection, reviewSummary, shouldReduceMotion, words]);

    const sendRating = useCallback(async (action: PendingRatingAction) => {
        setIsRatingPending(true);
        setRatingError(null);

        try {
            const outcome = await retryIdempotentAction(() => rateReview.mutateAsync(action));
            if (pendingRatingRef.current?.actionId !== action.actionId) return;

            pendingRatingRef.current = null;
            setPendingRating(null);
            setIsRatingPending(false);
            setRatingStatus(play("reviewScheduled", { due: formatDueDate(outcome.dueAt) }));
            void utils.game.getFlashcardReviewSummary.invalidate();
            void utils.game.getDueFlashcardReviews.invalidate();
            advanceAfterRating();
        } catch {
            if (pendingRatingRef.current?.actionId !== action.actionId) return;
            setIsRatingPending(false);
            setRatingError(play("ratingError"));
        }
    }, [advanceAfterRating, formatDueDate, play, rateReview, utils.game.getDueFlashcardReviews, utils.game.getFlashcardReviewSummary]);

    const rateCurrentCard = useCallback((rating: FlashcardRating) => {
        const card = words[currentIndex];
        if (!isSignedIn || !card || isRatingPending || pendingRatingRef.current) return;

        const action: PendingRatingAction = {
            actionId: crypto.randomUUID(),
            meaningId: card.meaningId,
            direction: getCardDirection(card),
            rating,
        };
        pendingRatingRef.current = action;
        setPendingRating(action);
        void sendRating(action);
    }, [currentIndex, getCardDirection, isRatingPending, isSignedIn, sendRating, words]);

    const retryPendingRating = useCallback(() => {
        const action = pendingRatingRef.current;
        if (action && !isRatingPending) void sendRating(action);
    }, [isRatingPending, sendRating]);

    useEffect(() => {
        if (!focusNextCardRef.current || gameState !== "playing") return;
        const timer = window.setTimeout(() => {
            cardRef.current?.focus();
            focusNextCardRef.current = false;
        }, shouldReduceMotion ? 0 : 120);

        return () => window.clearTimeout(timer);
    }, [currentIndex, gameState, shouldReduceMotion]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (gameState !== "playing" || isInteractiveTarget(event.target)) return;

            if (event.code === "Space") {
                event.preventDefault();
                flipCard();
            }
            if (event.code === "ArrowRight") {
                event.preventDefault();
                goNext();
            }
            if (event.code === "ArrowLeft") {
                event.preventDefault();
                goPrevious();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [flipCard, gameState, goNext, goPrevious]);

    if (gameState === "setup") {
        const hasDueReviews = (reviewSummary.data?.dueCount ?? 0) > 0;
        const hasStartedReviews = (reviewSummary.data?.totalCount ?? 0) > 0;

        return (
            <section className={styles.page} aria-labelledby="flashcard-title">
                <header className={styles.intro}>
                    <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="flashcard-title">{t("title")}</h1>
                    <p>{play("setupDescription")}</p>
                </header>

                <div className={styles.setupLayout}>
                    <form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); void startPracticeDeck(); }}>
                        <fieldset>
                            <legend>{t("cardCount")}</legend>
                            <div className={styles.choiceGrid}>
                                {[10, 20, 30, 50].map((count) => (
                                    <ControlButton key={count} className={cardCount === count ? styles.selected : ""} aria-pressed={cardCount === count} onClick={() => setCardCount(count)}>
                                        {play("cards", { count })}
                                    </ControlButton>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>{t("source")}</legend>
                            <div className={styles.choiceGrid}>
                                <ControlButton className={source === "all" ? styles.selected : ""} aria-pressed={source === "all"} onClick={() => setSource("all")}>{t("sourceAll")}</ControlButton>
                                <ControlButton className={source === "saved" ? styles.selected : ""} aria-pressed={source === "saved"} disabled={!session} onClick={() => setSource("saved")}>{t("sourceSaved")}</ControlButton>
                            </div>
                            {!session && <p className={styles.hint}>{t("signInForSaved")}</p>}
                        </fieldset>

                        <fieldset>
                            <legend>{t("defaultSide")}</legend>
                            <div className={styles.choiceGrid}>
                                <ControlButton className={defaultSide === "word" ? styles.selected : ""} aria-pressed={defaultSide === "word"} onClick={() => setDefaultSide("word")}>{t("showWordFirst")}</ControlButton>
                                <ControlButton className={defaultSide === "meaning" ? styles.selected : ""} aria-pressed={defaultSide === "meaning"} onClick={() => setDefaultSide("meaning")}>{t("showMeaningFirst")}</ControlButton>
                            </div>
                        </fieldset>

                        {isSignedIn ? (
                            <section className={styles.reviewEntry} aria-live="polite">
                                <p className={styles.reviewEntryTitle}><Clock3 aria-hidden="true" /> {play("reviewQueue")}</p>
                                {reviewSummary.isLoading ? <p>{play("reviewLoading")}</p> : null}
                                {reviewSummary.isError ? <p className={styles.errorHint} role="alert">{play("reviewLoadError")}</p> : null}
                                {!reviewSummary.isLoading && !reviewSummary.isError && !hasStartedReviews ? <p>{play("noReviewsYet")}</p> : null}
                                {!reviewSummary.isLoading && !reviewSummary.isError && hasStartedReviews && !hasDueReviews ? (
                                    <p>{play("caughtUp", { due: reviewSummary.data?.nextDueAt ? formatDueDate(reviewSummary.data.nextDueAt) : "" })}</p>
                                ) : null}
                                {hasDueReviews ? (
                                    <button type="button" className={styles.dueAction} onClick={() => void startDueDeck()}>
                                        <Clock3 aria-hidden="true" /> {play("reviewDue", { count: reviewSummary.data?.dueCount ?? 0 })}
                                    </button>
                                ) : null}
                            </section>
                        ) : (
                            <p className={styles.practiceHint}>{play("untrackedPractice")}</p>
                        )}

                        {loadError && <p className={styles.errorHint} role="alert">{loadError}</p>}
                        <button className={styles.primaryAction} type="submit">{t("startGame")} <ChevronRight aria-hidden="true" /></button>
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
            <section className={`${styles.page} ${styles.loadingPage}`} aria-labelledby="flashcard-title" aria-busy="true">
                <header className={styles.playHeader}>
                    <div>
                        <p className={styles.kicker}>{deckMode === "due" ? play("reviewQueue") : play("roundKicker")}</p>
                        <h1 id="flashcard-title">{t("title")}</h1>
                    </div>
                    <p className={styles.progressText}>{t("loading")}</p>
                </header>

                <div className={`${styles.progressTrack} ${styles.loadingProgressTrack}`} aria-hidden="true"><span /></div>

                <div className={styles.cardStage}>
                    <div className={`${styles.flashcard} ${styles.loadingFlashcard}`} role="status" aria-live="polite">
                        <div className={`${styles.cardWord} ${styles.loadingCardFace}`}>
                            <span className={styles.cardLabel}>{t("word")}</span>
                            <div className={styles.loadingWordMark} aria-hidden="true">
                                <span />
                                <span />
                                <span />
                            </div>
                            <span className={styles.loadingPhonetic} aria-hidden="true" />
                            <span className={`${styles.flipHint} ${styles.loadingCaption}`}>{t("loading")}</span>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (gameState === "finished") {
        const hasMoreDueReviews = deckMode === "due" && (reviewSummary.data?.dueCount ?? 0) > 0;

        return (
            <section className={`${styles.page} ${styles.finished}`} aria-labelledby="finished-title">
                <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundCompleteKicker")}</p>
                <h1 id="finished-title">{deckMode === "due" ? play("dueQueueCompleteTitle") : play("roundCompleteTitle")}</h1>
                <p>{deckMode === "due" ? play("dueQueueCompleteDescription", { count: words.length }) : play("roundCompleteDescription", { count: words.length })}</p>
                <div className={styles.finishedActions}>
                    {deckMode === "due" && hasMoreDueReviews ? (
                        <button type="button" className={styles.primaryAction} onClick={() => void startDueDeck()}>{play("reviewDue", { count: reviewSummary.data?.dueCount ?? 0 })} <Clock3 aria-hidden="true" /></button>
                    ) : (
                        <button type="button" className={styles.primaryAction} onClick={replay}>{play("playAgain")} <RotateCcw aria-hidden="true" /></button>
                    )}
                    <button type="button" className={styles.secondaryAction} onClick={restartSetup}>{t("settings")}</button>
                </div>
            </section>
        );
    }

    const currentWord = words[currentIndex];
    const currentDirection = getCardDirection(currentWord!);
    const isAnswerRevealed = isFlipped !== startsOnMeaning(currentDirection);
    const progress = words.length ? ((currentIndex + 1) / words.length) * 100 : 0;
    const canRate = isSignedIn && isAnswerRevealed;
    const hasUnresolvedRating = isRatingPending || Boolean(pendingRating);

    return (
        <section className={styles.page} aria-labelledby="flashcard-title">
            <header className={styles.playHeader}>
                <div>
                    <p className={styles.kicker}>{deckMode === "due" ? play("reviewQueue") : play("roundKicker")}</p>
                    <h1 id="flashcard-title">{t("title")}</h1>
                </div>
                <p className={styles.progressText}>{t("progress", { current: currentIndex + 1, total: words.length })}</p>
            </header>

            <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

            <div className={styles.cardStage}>
                <motion.button
                    ref={cardRef}
                    type="button"
                    className={styles.flashcard}
                    onClick={flipCard}
                    aria-label={t("flip")}
                    aria-pressed={isAnswerRevealed}
                    disabled={hasUnresolvedRating}
                    data-flashcard-trigger
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`${currentWord.meaningId}-${isFlipped ? "meaning" : "word"}`}
                            className={isFlipped ? styles.cardMeaning : styles.cardWord}
                            initial={shouldReduceMotion ? false : { opacity: 0, rotateY: isFlipped ? -82 : 82 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={shouldReduceMotion ? undefined : { opacity: 0, rotateY: isFlipped ? 82 : -82 }}
                            transition={{ duration: 0.28, ease: "easeInOut" }}
                        >
                            {isFlipped ? (
                                <>
                                    <span className={styles.cardLabel}>{t("meaning")}</span>
                                    {currentWord.partOfSpeech && <span className={styles.partOfSpeech}>{currentWord.partOfSpeech}</span>}
                                    <p className={styles.meaning}>{currentWord.meaning}</p>
                                </>
                            ) : (
                                <>
                                    <span className={styles.cardLabel}>{t("word")}</span>
                                    <strong>{currentWord.name}</strong>
                                    {currentWord.phonetic && <span className={styles.phonetic}>[{currentWord.phonetic}]</span>}
                                </>
                            )}
                            <span className={styles.flipHint}>{t("clickToFlip")}</span>
                        </motion.div>
                    </AnimatePresence>
                </motion.button>
            </div>

            {canRate ? (
                <section className={styles.ratingPanel} aria-label={play("rateCard")}>
                    <p>{play("rateCard")}</p>
                    <div className={styles.ratingActions}>
                        {(["again", "hard", "good", "easy"] as const).map((rating) => (
                            <button
                                key={rating}
                                type="button"
                                className={`${styles.ratingButton} ${styles[`rating${rating[0].toUpperCase()}${rating.slice(1)}`]}`}
                                onClick={() => rateCurrentCard(rating)}
                                disabled={hasUnresolvedRating}
                            >
                                {play(`rating${rating[0].toUpperCase()}${rating.slice(1)}`)}
                            </button>
                        ))}
                    </div>
                    {isRatingPending ? <p className={styles.ratingHint}>{play("savingRating")}</p> : null}
                    {ratingError ? (
                        <div className={styles.ratingError} role="alert">
                            <span>{ratingError}</span>
                            <button type="button" onClick={retryPendingRating} disabled={!pendingRating || isRatingPending}>{play("retryRating")}</button>
                        </div>
                    ) : null}
                    {deckMode === "practice" && !isRatingPending && !pendingRating ? (
                        <button type="button" className={styles.skipAction} onClick={goNext}>{play("skipCard")} <ChevronRight aria-hidden="true" /></button>
                    ) : null}
                </section>
            ) : (
                <div className={styles.controls}>
                    {deckMode === "practice" ? <button type="button" className={styles.iconAction} onClick={goPrevious} disabled={currentIndex === 0} aria-label={t("previous")}><ChevronLeft aria-hidden="true" /></button> : null}
                    <button type="button" className={styles.flipAction} onClick={flipCard} disabled={hasUnresolvedRating}>{t("flip")}</button>
                    {deckMode === "practice" ? <button type="button" className={styles.iconAction} onClick={goNext} aria-label={t("next")}><ChevronRight aria-hidden="true" /></button> : null}
                    {deckMode === "practice" ? <span className={styles.controlDivider} aria-hidden="true" /> : null}
                    {deckMode === "practice" ? <button type="button" className={styles.utilityAction} onClick={shuffleCards}><Shuffle aria-hidden="true" /> <span>{t("shuffle")}</span></button> : null}
                    <button type="button" className={styles.utilityAction} onClick={restartSetup}><RotateCcw aria-hidden="true" /> <span>{t("settings")}</span></button>
                </div>
            )}

            <p className={styles.keyboardHint}><kbd>Space</kbd> {t("flip")} {deckMode === "practice" ? <><span>•</span> <kbd>←</kbd><kbd>→</kbd> {play("navigate")}</> : null}</p>
            <p className={styles.srOnly} role="status" aria-live="polite">{ratingStatus}</p>
            {canRate && !isRatingPending ? <p className={styles.reviewReminder}><Check aria-hidden="true" /> {play("ratingReminder")}</p> : null}
        </section>
    );
}
