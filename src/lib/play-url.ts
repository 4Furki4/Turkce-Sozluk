export function getPlayHomePath(locale: string): string {
    return locale === "tr" ? "/tr/oyna" : "/en/play";
}

export function getPlayFlashcardPath(locale: string): string {
    return locale === "tr" ? "/tr/oyna/kelime-kartlari" : "/en/play/flashcards";
}

export function getPlayWordMatchingPath(locale: string): string {
    return locale === "tr" ? "/tr/oyna/kelime-eslestirme" : "/en/play/word-matching";
}

export function getPlaySpeedRoundPath(locale: string): string {
    return locale === "tr" ? "/tr/oyna/hizli-tur" : "/en/play/speed-round";
}

export function getSafeAuthReturnUrl(backTo: string | null, currentOrigin: string): string | null {
    if (!backTo) {
        return null;
    }

    try {
        // Legacy callers sometimes encode the entire target. Decode only that envelope;
        // normal query parameters may legitimately contain %26, %25, and nested URLs.
        const candidate = /^(?:%2f|https?%3a)/i.test(backTo) ? decodeURIComponent(backTo) : backTo;
        if (/^[\\\u0000-\u0020]/.test(candidate) || candidate.startsWith("//") || candidate.includes("\\")) return null;
        const target = new URL(candidate, currentOrigin);

        if (target.origin !== new URL(currentOrigin).origin) {
            return null;
        }

        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}
