"use client";

import type { Session } from "@/src/lib/auth-client";
import { shuffleArray } from "@/src/lib/game";
import { api } from "@/src/trpc/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import styles from "./play-flashcard-game.module.css";

interface PlayFlashcardGameProps {
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

type GameState = "setup" | "loading" | "playing" | "finished";

function ControlButton({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" className={`${styles.controlButton} ${className || ""}`} {...props}>{children}</button>;
}

export default function PlayFlashcardGame({ session, locale }: PlayFlashcardGameProps) {
    const t = useTranslations("FlashcardGame");
    const play = useTranslations("Play.flashcards");
    const shouldReduceMotion = useReducedMotion();
    const [cardCount, setCardCount] = useState(10);
    const [source, setSource] = useState<"all" | "saved">("all");
    const [defaultSide, setDefaultSide] = useState<"word" | "meaning">("word");
    const [gameState, setGameState] = useState<GameState>("setup");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [words, setWords] = useState<FlashcardWord[]>([]);

    const { refetch } = api.game.getRandomWordsForFlashcards.useQuery(
        { count: cardCount, source },
        { enabled: gameState !== "finished" },
    );

    const startGame = useCallback(async () => {
        setWords([]);
        setCurrentIndex(0);
        setIsFlipped(defaultSide === "meaning");
        setGameState("loading");

        const result = await refetch();
        if (result.data?.words?.length) {
            setWords(result.data.words);
            setGameState("playing");
        } else {
            setGameState("setup");
        }
    }, [defaultSide, refetch]);

    const flipCard = useCallback(() => setIsFlipped((value) => !value), []);
    const goNext = useCallback(() => {
        if (currentIndex >= words.length - 1) {
            setGameState("finished");
            return;
        }

        setIsFlipped(defaultSide === "meaning");
        window.setTimeout(() => setCurrentIndex((value) => value + 1), shouldReduceMotion ? 0 : 110);
    }, [currentIndex, defaultSide, shouldReduceMotion, words.length]);
    const goPrevious = useCallback(() => {
        if (currentIndex === 0) return;
        setIsFlipped(defaultSide === "meaning");
        window.setTimeout(() => setCurrentIndex((value) => value - 1), shouldReduceMotion ? 0 : 110);
    }, [currentIndex, defaultSide, shouldReduceMotion]);
    const shuffleCards = useCallback(() => {
        setWords((currentWords) => shuffleArray(currentWords));
        setCurrentIndex(0);
        setIsFlipped(defaultSide === "meaning");
    }, [defaultSide]);
    const restartSetup = useCallback(() => {
        setGameState("setup");
        setCurrentIndex(0);
        setIsFlipped(false);
        setWords([]);
    }, []);
    const replay = useCallback(() => {
        setCurrentIndex(0);
        setIsFlipped(defaultSide === "meaning");
        setGameState("playing");
    }, [defaultSide]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (gameState !== "playing") return;

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
        return (
            <section className={styles.page} aria-labelledby="flashcard-title">
                <header className={styles.intro}>
                    <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="flashcard-title">{t("title")}</h1>
                    <p>{play("setupDescription")}</p>
                </header>

                <div className={styles.setupLayout}>
                    <form className={styles.setupPanel} onSubmit={(event) => { event.preventDefault(); void startGame(); }}>
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
                        <p className={styles.kicker}>{play("roundKicker")}</p>
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
        return (
            <section className={`${styles.page} ${styles.finished}`} aria-labelledby="finished-title">
                <p className={styles.kicker}><Sparkles aria-hidden="true" /> {play("roundCompleteKicker")}</p>
                <h1 id="finished-title">{play("roundCompleteTitle")}</h1>
                <p>{play("roundCompleteDescription", { count: words.length })}</p>
                <div className={styles.finishedActions}>
                    <button type="button" className={styles.primaryAction} onClick={replay}>{play("playAgain")} <RotateCcw aria-hidden="true" /></button>
                    <button type="button" className={styles.secondaryAction} onClick={restartSetup}>{t("settings")}</button>
                </div>
            </section>
        );
    }

    const currentWord = words[currentIndex];
    const progress = words.length ? ((currentIndex + 1) / words.length) * 100 : 0;

    return (
        <section className={styles.page} aria-labelledby="flashcard-title">
            <header className={styles.playHeader}>
                <div>
                    <p className={styles.kicker}>{play("roundKicker")}</p>
                    <h1 id="flashcard-title">{t("title")}</h1>
                </div>
                <p className={styles.progressText}>{t("progress", { current: currentIndex + 1, total: words.length })}</p>
            </header>

            <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

            <div className={styles.cardStage}>
                <motion.button
                    type="button"
                    className={styles.flashcard}
                    onClick={flipCard}
                    aria-label={t("flip")}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={`${currentWord.id}-${isFlipped ? "meaning" : "word"}`}
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

            <div className={styles.controls}>
                <button type="button" className={styles.iconAction} onClick={goPrevious} disabled={currentIndex === 0} aria-label={t("previous")}><ChevronLeft aria-hidden="true" /></button>
                <button type="button" className={styles.flipAction} onClick={flipCard}>{t("flip")}</button>
                <button type="button" className={styles.iconAction} onClick={goNext} aria-label={t("next")}><ChevronRight aria-hidden="true" /></button>
                <span className={styles.controlDivider} aria-hidden="true" />
                <button type="button" className={styles.utilityAction} onClick={shuffleCards}><Shuffle aria-hidden="true" /> <span>{t("shuffle")}</span></button>
                <button type="button" className={styles.utilityAction} onClick={restartSetup}><RotateCcw aria-hidden="true" /> <span>{t("settings")}</span></button>
            </div>

            <p className={styles.keyboardHint}><kbd>Space</kbd> {t("flip")} <span>•</span> <kbd>←</kbd><kbd>→</kbd> {play("navigate")}</p>
        </section>
    );
}
