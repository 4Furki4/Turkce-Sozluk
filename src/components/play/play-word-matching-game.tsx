"use client";

import type { Session } from "@/src/lib/auth-client";
import { shuffleArray } from "@/src/lib/game";
import { api } from "@/src/trpc/react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Link2, RotateCcw, Sparkles, Timer, Trophy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./play-word-matching-game.module.css";

interface PlayWordMatchingGameProps {
    session: Session | null;
    locale: "en" | "tr";
}

interface MatchPair {
    id: number;
    word: string;
    meaning: string;
}

type GameMode = "relaxed" | "timed";
type GameState = "setup" | "loading" | "playing" | "finished";

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

export default function PlayWordMatchingGame({ session }: PlayWordMatchingGameProps) {
    const t = useTranslations("WordMatchingGame");
    const play = useTranslations("Play.wordMatching");
    const shouldReduceMotion = useReducedMotion();
    const [pairCount, setPairCount] = useState(6);
    const [source, setSource] = useState<"all" | "saved">("all");
    const [gameMode, setGameMode] = useState<GameMode>("relaxed");
    const [gameState, setGameState] = useState<GameState>("setup");
    const [wordItems, setWordItems] = useState<MatchPair[]>([]);
    const [meaningItems, setMeaningItems] = useState<MatchPair[]>([]);
    const [selectedWord, setSelectedWord] = useState<number | null>(null);
    const [selectedMeaning, setSelectedMeaning] = useState<number | null>(null);
    const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
    const [mismatch, setMismatch] = useState<{ wordId: number; meaningId: number } | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);

    const { refetch } = api.game.getWordsForMatching.useQuery(
        { pairCount, source },
        { enabled: false },
    );

    const prepareRound = useCallback((pairs: MatchPair[]) => {
        setWordItems(pairs);
        setMeaningItems(shuffleArray(pairs));
        setMatchedIds(new Set());
        setSelectedWord(null);
        setSelectedMeaning(null);
        setMismatch(null);
        setMistakes(0);
        setTimeLeft(60);
        setElapsedTime(0);
        setGameState("playing");
    }, []);

    const startGame = useCallback(async () => {
        setGameState("loading");
        setLoadError(null);
        setWordItems([]);
        setMeaningItems([]);
        setMatchedIds(new Set());
        setSelectedWord(null);
        setSelectedMeaning(null);
        setMismatch(null);
        setMistakes(0);
        setTimeLeft(60);
        setElapsedTime(0);

        const result = await refetch();
        const pairs = result.data?.pairs as MatchPair[] | undefined;

        if (pairs?.length) {
            prepareRound(pairs);
            return;
        }

        setLoadError(result.data?.error === "noSavedWords" ? play("noSavedWords") : play("noWords"));
        setGameState("setup");
    }, [play, prepareRound, refetch]);

    const restartSetup = useCallback(() => {
        setGameState("setup");
        setSelectedWord(null);
        setSelectedMeaning(null);
        setMismatch(null);
        setLoadError(null);
    }, []);

    const resolveMatch = useCallback((wordId: number, meaningId: number) => {
        if (wordId === meaningId) {
            setMatchedIds((current) => new Set(current).add(wordId));
        } else {
            setMistakes((current) => current + 1);
            setMismatch({ wordId, meaningId });
            window.setTimeout(() => setMismatch(null), shouldReduceMotion ? 0 : 480);
        }

        setSelectedWord(null);
        setSelectedMeaning(null);
    }, [shouldReduceMotion]);

    const chooseWord = useCallback((id: number) => {
        if (matchedIds.has(id)) return;

        if (selectedMeaning !== null) {
            resolveMatch(id, selectedMeaning);
            return;
        }

        setSelectedWord(id);
    }, [matchedIds, resolveMatch, selectedMeaning]);

    const chooseMeaning = useCallback((id: number) => {
        if (matchedIds.has(id)) return;

        if (selectedWord !== null) {
            resolveMatch(selectedWord, id);
            return;
        }

        setSelectedMeaning(id);
    }, [matchedIds, resolveMatch, selectedWord]);

    useEffect(() => {
        if (gameState !== "playing") return;

        const interval = window.setInterval(() => {
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
    }, [gameMode, gameState]);

    useEffect(() => {
        if (gameState === "playing" && wordItems.length > 0 && matchedIds.size === wordItems.length) {
            setGameState("finished");
        }
    }, [gameState, matchedIds.size, wordItems.length]);

    const score = useMemo(
        () => Math.max(0, matchedIds.size * 100 - mistakes * 10),
        [matchedIds.size, mistakes],
    );
    const boardSize = wordItems.length || pairCount;
    const displayTime = gameMode === "timed" ? 60 - timeLeft : elapsedTime;

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
                            {loadError && <p className={styles.errorHint} role="alert">{loadError}</p>}
                        </fieldset>

                        <button className={styles.primaryAction} type="submit">{t("startGame")} <Link2 aria-hidden="true" /></button>
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
        const isWin = matchedIds.size === wordItems.length;

        return (
            <section className={`${styles.page} ${styles.finished}`} aria-labelledby="finished-title">
                <p className={styles.kicker}><Trophy aria-hidden="true" /> {play("roundCompleteKicker")}</p>
                <h1 id="finished-title">{isWin ? t("congratulations") : t("timeUp")}</h1>
                <p>{isWin ? play("roundCompleteDescription") : play("timeUpDescription")}</p>
                <div className={styles.results}>
                    <span><b>{matchedIds.size}/{boardSize}</b>{t("matchedPairs")}</span>
                    <span><b>{score}</b>{t("score")}</span>
                    <span><b>{mistakes}</b>{t("mistakes")}</span>
                    <span><b>{formatTime(displayTime)}</b>{t("time")}</span>
                </div>
                <div className={styles.finishedActions}>
                    <button type="button" className={styles.primaryAction} onClick={() => void startGame()}>{t("playAgain")} <RotateCcw aria-hidden="true" /></button>
                    <button type="button" className={styles.secondaryAction} onClick={restartSetup}>{t("settings")}</button>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.page} aria-labelledby="word-matching-title">
            <header className={styles.playHeader}>
                <div>
                    <p className={styles.kicker}><Link2 aria-hidden="true" /> {play("roundKicker")}</p>
                    <h1 id="word-matching-title">{t("title")}</h1>
                </div>
                <div className={styles.scoreboard} aria-label={play("scoreboard")}>
                    <span><Check aria-hidden="true" /> {matchedIds.size}/{boardSize}</span>
                    <span><X aria-hidden="true" /> {mistakes}</span>
                    <span><Timer aria-hidden="true" /> {formatTime(gameMode === "timed" ? timeLeft : elapsedTime)}</span>
                    <button type="button" onClick={restartSetup} aria-label={t("restart")}><RotateCcw aria-hidden="true" /></button>
                </div>
            </header>

            <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${(matchedIds.size / boardSize) * 100}%` }} /></div>

            <div className={styles.matchBoard}>
                <div className={styles.matchColumn}>
                    <h2>{t("words")}</h2>
                    {wordItems.map((item, index) => {
                        const matched = matchedIds.has(item.id);
                        const selected = selectedWord === item.id;
                        const incorrect = mismatch?.wordId === item.id;

                        return (
                            <motion.button
                                type="button"
                                key={item.id}
                                className={`${styles.matchChoice} ${matched ? styles.matched : ""} ${selected ? styles.selectedChoice : ""} ${incorrect ? styles.incorrect : ""}`}
                                onClick={() => chooseWord(item.id)}
                                disabled={matched}
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
                        const matched = matchedIds.has(item.id);
                        const selected = selectedMeaning === item.id;
                        const incorrect = mismatch?.meaningId === item.id;

                        return (
                            <motion.button
                                type="button"
                                key={item.id}
                                className={`${styles.matchChoice} ${styles.meaningChoice} ${matched ? styles.matched : ""} ${selected ? styles.selectedChoice : ""} ${incorrect ? styles.incorrect : ""}`}
                                onClick={() => chooseMeaning(item.id)}
                                disabled={matched}
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
        </section>
    );
}
