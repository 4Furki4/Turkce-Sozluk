export function getPlayHomePath(locale: string): string {
    return locale === "tr" ? "/tr/oyna" : "/en/play";
}

export function getPlayFlashcardPath(locale: string): string {
    return locale === "tr" ? "/tr/oyna/kelime-kartlari" : "/en/play/flashcards";
}

export function getPlayWordMatchingPath(locale: string): string {
    return locale === "tr" ? "/tr/oyna/kelime-eslestirme" : "/en/play/word-matching";
}

export function getSafeAuthReturnUrl(backTo: string | null, currentOrigin: string): string | null {
    if (!backTo) {
        return null;
    }

    try {
        const target = new URL(decodeURIComponent(backTo), currentOrigin);

        if (target.origin !== new URL(currentOrigin).origin) {
            return null;
        }

        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}
