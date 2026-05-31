const SEARCH_ROUTE_SEGMENTS = new Set(["search", "arama"]);
export type SearchLocale = "en" | "tr";
export const OFFLINE_SEARCH_PARAM = "offlineWord";
export const SEARCH_QUERY_PARAM = "word";

export const toSingleRouteParam = (
    value: string | string[] | undefined,
): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

export const decodePathSegment = (segment: string): string => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
};

export const extractSearchWordFromPathname = (
    pathname: string,
): string | undefined => {
    const segments = pathname.split("/").filter(Boolean);
    const searchIndex = segments.findIndex((segment) =>
        SEARCH_ROUTE_SEGMENTS.has(segment),
    );

    if (searchIndex === -1) {
        return undefined;
    }

    const maybeWord = segments[searchIndex + 1];
    return maybeWord ? decodePathSegment(maybeWord) : undefined;
};

export const normalizeSearchWord = (value: string | string[] | undefined): string => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    return (rawValue ?? "").replace(/\s+/g, " ").trim();
};

export const getPlainSearchAction = (locale: string): string =>
    locale === "en" ? "/en/search" : "/tr/arama";

export const getSearchQueryHref = (locale: string, word: string): string => {
    const searchPath = getPlainSearchAction(locale);
    const params = new URLSearchParams({
        [SEARCH_QUERY_PARAM]: word,
    });

    return `${searchPath}?${params.toString()}`;
};

export const getDynamicWordHref = (locale: string, word: string): string => {
    const searchPath = getPlainSearchAction(locale);
    const encodedWord = encodeURIComponent(normalizeSearchWord(word));

    return `${searchPath}/${encodedWord}`;
};

export const getOfflineSearchHref = getDynamicWordHref;
export const getWordSearchHref = getDynamicWordHref;
