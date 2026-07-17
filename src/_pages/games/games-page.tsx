"use client";

import { ArcadeCabinet } from "@/src/components/games/arcade-cabinet";
import { Link } from "@/src/i18n/routing";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Clock3, Layers, Link2, Sparkles, Trophy, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import styles from "./games-page.module.css";

const gameDefinitions = [
    {
        key: "flashcards",
        href: "/play/flashcards" as const,
        icon: Layers,
    },
    {
        key: "matching",
        href: "/word-matching" as const,
        icon: Link2,
    },
    {
        key: "speedRound",
        href: "/speed-round" as const,
        icon: Zap,
    },
] as const;

type GameDefinition = (typeof gameDefinitions)[number];

function GameTile({ game, index }: { game: GameDefinition; index: number }) {
    const t = useTranslations("GamesHub");
    const Icon = game.icon as LucideIcon;
    const shouldReduceMotion = useReducedMotion();

    const tileContent = <>
        <span className={styles.gameTag}>
            {t(`games.${game.key}.tag`)}
        </span>
        <span className={styles.gameIcon}>
            <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className={styles.gameTitle}>
            {t(`games.${game.key}.title`)}
        </h2>
        <p className={styles.gameDescription}>
            {t(`games.${game.key}.description`)}
        </p>
        <span className={styles.gameCta}>
            {t("playGame")} <ArrowRight className={styles.gameCtaIcon} aria-hidden="true" />
        </span>
        <span className={styles.gameIndex} aria-hidden="true">
            {index + 1}
        </span>
    </>;

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: index * 0.08 }}
            className={styles.tileMotion}
        >
            <Link href={game.href} className={`${styles.gameTile} ${styles[game.key]}`}>{tileContent}</Link>
        </motion.div>
    );
}

export default function GamesPage() {
    const t = useTranslations("GamesHub");
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className={styles.root}>
            <section className={styles.hero}>
                <div className={styles.heroPattern} />
                <div className={styles.heroInner}>
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        className={styles.heroCopy}
                    >
                        <p className={styles.heroEyebrow}>
                            {t("eyebrow")}
                        </p>
                        <h1 className={styles.heroTitle}>
                            {t("heroTitleFirst")}<br />
                            {t("heroTitleSecond")}<br />
                            <em className="not-italic text-[#ffd76a]">{t("heroTitleAccent")}</em>
                        </h1>
                        <p className={styles.heroDescription}>
                            {t("heroDescription")}
                        </p>
                        <div className={styles.heroActions}>
                            <a href="#games" className={`${styles.heroAction} ${styles.heroPrimary}`}>
                                {t("heroPrimaryAction")} <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </a>
                            <Link href="/leaderboards" className={`${styles.heroAction} ${styles.heroSecondary}`}>
                                {t("heroSecondaryAction")} <Trophy className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94, rotate: 0 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, rotate: 2 }}
                        transition={{ duration: 0.52, delay: 0.12, ease: "easeOut" }}
                        className={styles.cabinetMotion}
                    >
                        <ArcadeCabinet
                            kicker={t("cabinetKicker")}
                            word={t("cabinetWord")}
                            meaning={t("cabinetMeaning")}
                            points={t("cabinetPoints")}
                        />
                    </motion.div>
                </div>
            </section>

            <div className={styles.main}>
                <div className={styles.content}>
                    <section id="games" aria-labelledby="games-title" className={styles.gamesSection}>
                        <motion.div
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.35 }}
                            className={styles.gamesIntro}
                        >
                            <div>
                                <p className={styles.sectionEyebrow}>
                                    {t("gamesEyebrow")}
                                </p>
                                <h2 id="games-title" className={styles.sectionTitle}>
                                    {t("gamesTitleFirst")}<br />{t("gamesTitleSecond")}
                                </h2>
                            </div>
                            <p className={styles.sectionDescription}>
                                {t("gamesDescription")}
                            </p>
                        </motion.div>

                        <div className={styles.gameGrid}>
                            {gameDefinitions.map((game, index) => (
                                <GameTile game={game} index={index} key={game.key} />
                            ))}
                        </div>
                    </section>

                    <section aria-labelledby="loop-title" className={styles.loopSection}>
                        <div className={styles.loopPanel}>
                            <p className={`${styles.sectionEyebrow} ${styles.loopEyebrow}`}>
                                {t("loopEyebrow")}
                            </p>
                            <h2 id="loop-title" className={styles.loopTitle}>
                                {t("loopTitle")}
                            </h2>
                            <div className={styles.loopGrid}>
                                {[
                                    { icon: Layers, title: t("loop.study.title"), body: t("loop.study.description"), tone: "bg-[#ffd76a]" },
                                    { icon: Link2, title: t("loop.match.title"), body: t("loop.match.description"), tone: "bg-[#5ac8ae]" },
                                    { icon: Zap, title: t("loop.perform.title"), body: t("loop.perform.description"), tone: "bg-[#5b8def]" },
                                ].map(({ icon: Icon, title, body }, index) => (
                                    <motion.article
                                        initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                                        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ duration: 0.3, delay: index * 0.08 }}
                                        key={title}
                                    >
                                        <span className={`${styles.loopIcon} ${index === 0 ? styles.loopIconYellow : index === 1 ? styles.loopIconMint : styles.loopIconBlue}`}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className={styles.loopItemTitle}>{title}</h3>
                                        <p className={styles.loopItemDescription}>{body}</p>
                                    </motion.article>
                                ))}
                            </div>
                        </div>
                    </section>

                    <motion.section
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.35 }}
                        aria-labelledby="coming-title"
                        className={styles.comingSection}
                    >
                        <span className={styles.comingIcon}>
                            <Sparkles className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div>
                            <p className={styles.comingEyebrow}>{t("comingEyebrow")}</p>
                            <h2 id="coming-title" className={styles.comingTitle}>{t("comingTitle")}</h2>
                            <p className={styles.comingDescription}>{t("comingDescription")}</p>
                        </div>
                        <span className={styles.comingBadge}>
                            <Clock3 className="h-4 w-4" aria-hidden="true" /> {t("comingBadge")}
                        </span>
                    </motion.section>
                </div>
            </div>
        </div>
    );
}
