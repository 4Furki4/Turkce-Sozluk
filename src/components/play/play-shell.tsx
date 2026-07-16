import type { Session } from "@/src/lib/auth";
import { getDictionaryOrigin, getPlayPath } from "@/src/lib/play-url";
import { BookOpen, Gamepad2, UserRound } from "lucide-react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import styles from "./play-shell.module.css";

interface PlayShellProps {
    children: React.ReactNode;
    locale: "en" | "tr";
    session: Session | null;
}

function getRequestOrigin(requestHeaders: Headers): string {
    const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim()
        || requestHeaders.get("host");
    const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();

    if (host) {
        const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
            ? forwardedProtocol
            : host.includes("localhost") ? "http" : "https";

        try {
            return new URL(`${protocol}://${host}`).origin;
        } catch {
            // Use the local Play origin below if an upstream proxy sends a malformed host.
        }
    }

    return "http://oyna.localhost:3000";
}

function getDictionaryUrl(dictionaryOrigin: string, locale: "en" | "tr", path = ""): string {
    const localizedPath = path || `/${locale}`;

    return new URL(localizedPath, dictionaryOrigin).toString();
}

function getDictionaryPath(dictionaryOrigin: string, locale: "en" | "tr", key: "signin" | "feedback" | "privacy"): string {
    const paths = {
        signin: locale === "tr" ? "/tr/giris-yap" : "/en/signin",
        feedback: locale === "tr" ? "/tr/geri-bildirim" : "/en/feedback",
        privacy: locale === "tr" ? "/tr/gizlilik-politikasi" : "/en/privacy-policy",
    } as const;

    return getDictionaryUrl(dictionaryOrigin, locale, paths[key]);
}

export async function PlayShell({ children, locale, session }: PlayShellProps) {
    const t = await getTranslations("Play");
    const playOrigin = getRequestOrigin(await headers());
    const dictionaryOrigin = getDictionaryOrigin(playOrigin);
    const flashcardHref = getPlayPath(locale);
    const signInUrl = new URL(getDictionaryPath(dictionaryOrigin, locale, "signin"));
    signInUrl.searchParams.set("backTo", new URL(flashcardHref, playOrigin).toString());
    const playerName = session?.user?.name || session?.user?.username;

    return (
        <div className={styles.shell}>
            <header className={styles.header}>
                <nav className={styles.nav} aria-label={t("navigationLabel")}>
                    <a className={styles.brand} href={`/${locale}`} aria-label={t("homeAriaLabel")}>
                        <Gamepad2 aria-hidden="true" />
                        <span>oyna</span><b>.</b>
                    </a>

                    <div className={styles.links}>
                        <a href={`/${locale}`}>{t("gameRoom")}</a>
                        <a className={styles.activeLink} href={flashcardHref}>{t("flashcardsNav")}</a>
                    </div>

                    <div className={styles.actions}>
                        <a className={styles.dictionaryLink} href={getDictionaryUrl(dictionaryOrigin, locale)}>
                            <BookOpen aria-hidden="true" />
                            <span>{t("backToDictionary")}</span>
                        </a>
                        {playerName ? (
                            <span className={styles.player} title={playerName}>
                                <UserRound aria-hidden="true" />
                                <span>{playerName}</span>
                            </span>
                        ) : (
                            <a className={styles.signIn} href={signInUrl.toString()}>
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
                    <a href={getDictionaryPath(dictionaryOrigin, locale, "feedback")}>{t("feedback")}</a>
                    <a href={getDictionaryPath(dictionaryOrigin, locale, "privacy")}>{t("privacy")}</a>
                </div>
            </footer>
        </div>
    );
}
