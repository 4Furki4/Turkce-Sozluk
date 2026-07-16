export type PlayLocale = "en" | "tr";

function getConfiguredPlayOrigin(): string | null {
    const configuredOrigin = process.env.NEXT_PUBLIC_PLAY_ORIGIN;

    if (!configuredOrigin) {
        return null;
    }

    try {
        return new URL(configuredOrigin).origin;
    } catch {
        return null;
    }
}

export function getPlayOrigin(dictionaryOrigin: string): string {
    const dictionaryUrl = new URL(dictionaryOrigin);

    // Keep local development self-contained even when a production public URL is
    // present in the local environment file.
    if (dictionaryUrl.hostname === "localhost") {
        dictionaryUrl.hostname = "oyna.localhost";
        return dictionaryUrl.origin;
    }

    const configuredOrigin = getConfiguredPlayOrigin();
    if (configuredOrigin) {
        return configuredOrigin;
    }

    if (!dictionaryUrl.hostname.startsWith("oyna.")) {
        dictionaryUrl.hostname = `oyna.${dictionaryUrl.hostname}`;
    }

    return dictionaryUrl.origin;
}

export function getDictionaryOrigin(playOrigin: string): string {
    const playUrl = new URL(playOrigin);

    if (playUrl.hostname.startsWith("oyna.")) {
        playUrl.hostname = playUrl.hostname.slice("oyna.".length);
    }

    return playUrl.origin;
}

export function getPlayPath(locale: string): string {
    return locale === "tr" ? "/tr/kelime-kartlari" : "/en/flashcard-game";
}

export function getPlayUrl(dictionaryOrigin: string, locale: string): string {
    return new URL(getPlayPath(locale), getPlayOrigin(dictionaryOrigin)).toString();
}

export function getSafeAuthReturnUrl(backTo: string | null, currentOrigin: string): string | null {
    if (!backTo) {
        return null;
    }

    try {
        const decodedBackTo = decodeURIComponent(backTo);
        const target = new URL(decodedBackTo, currentOrigin);
        const allowedOrigins = new Set([
            new URL(currentOrigin).origin,
            getPlayOrigin(currentOrigin),
        ]);

        return allowedOrigins.has(target.origin) ? target.toString() : null;
    } catch {
        return null;
    }
}
