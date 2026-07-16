import { Sparkles, ArrowRight, Layers3 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import styles from "./play-home.module.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Play" });

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
        robots: { index: false, follow: false },
    };
}

export default async function PlayHomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Play");
    const flashcardHref = locale === "tr" ? "/tr/kelime-kartlari" : "/en/flashcard-game";

    return (
        <section className={styles.page}>
            <div className={styles.heroCopy}>
                <p className={styles.eyebrow}><Sparkles aria-hidden="true" /> {t("homeEyebrow")}</p>
                <h1>{t("homeTitleFirst")}<br /><em>{t("homeTitleAccent")}</em></h1>
                <p className={styles.description}>{t("homeDescription")}</p>
                <a className={styles.cta} href={flashcardHref}>
                    <span>{t("startFlashcards")}</span><ArrowRight aria-hidden="true" />
                </a>
            </div>

            <div className={styles.deck} aria-hidden="true">
                <span className={styles.starOne}>✦</span>
                <span className={styles.starTwo}>✦</span>
                <div className={styles.backCard} />
                <div className={styles.frontCard}>
                    <Layers3 />
                    <small>{t("flashcardsNav")}</small>
                    <strong>{t("deckWord")}</strong>
                    <p>{t("deckMeaning")}</p>
                </div>
            </div>
        </section>
    );
}
