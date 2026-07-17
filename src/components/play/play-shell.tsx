import type { Session } from "@/src/lib/auth";
import { getPlayFlashcardPath, getPlayHomePath } from "@/src/lib/play-url";
import { BookOpen, Gamepad2, UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import styles from "./play-shell.module.css";

interface PlayShellProps {
    children: React.ReactNode;
    locale: "en" | "tr";
    session: Session | null;
}

function getDictionaryPath(locale: "en" | "tr", key: "signin" | "feedback" | "privacy"): string {
    const paths = {
        signin: locale === "tr" ? "/tr/giris-yap" : "/en/signin",
        feedback: locale === "tr" ? "/tr/geri-bildirim" : "/en/feedback",
        privacy: locale === "tr" ? "/tr/gizlilik-politikasi" : "/en/privacy-policy",
    } as const;

    return paths[key];
}

export async function PlayShell({ children, locale, session }: PlayShellProps) {
    const t = await getTranslations("Play");
    const playHomeHref = getPlayHomePath(locale);
    const flashcardHref = getPlayFlashcardPath(locale);
    const signInUrl = new URLSearchParams({ backTo: flashcardHref });
    const playerName = session?.user?.name || session?.user?.username;

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <nav className={styles.nav} aria-label={t("navigationLabel")}>
                    <a className={styles.brand} href={playHomeHref} aria-label={t("homeAriaLabel")}>
                        <Gamepad2 aria-hidden="true" />
                        <span>oyna</span><b>.</b>
                    </a>

                    <div className={styles.links}>
                        <a href={playHomeHref}>{t("gameRoom")}</a>
                        <a className={styles.activeLink} href={flashcardHref}>{t("flashcardsNav")}</a>
                    </div>

                    <div className={styles.actions}>
                        <a className={styles.dictionaryLink} href={`/${locale}`}>
                            <BookOpen aria-hidden="true" />
                            <span>{t("backToDictionary")}</span>
                        </a>
                        {playerName ? (
                            <span className={styles.player} title={playerName}>
                                <UserRound aria-hidden="true" />
                                <span>{playerName}</span>
                            </span>
                        ) : (
                            <a className={styles.signIn} href={`${getDictionaryPath(locale, "signin")}?${signInUrl.toString()}`}>
                                <UserRound aria-hidden="true" />
                                <span>{t("signIn")}</span>
                            </a>
                        )}
                    </div>
                </nav>
            </header>

            <main className={styles.main}>{children}</main>

            <footer className={styles.footer}>
                <p>{t("footerLine")}</p>
                <div>
                    <a href={getDictionaryPath(locale, "feedback")}>{t("feedback")}</a>
                    <a href={getDictionaryPath(locale, "privacy")}>{t("privacy")}</a>
                </div>
            </footer>
        </div>
    );
}
