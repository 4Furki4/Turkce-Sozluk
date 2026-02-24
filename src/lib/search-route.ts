const SEARCH_ROUTE_SEGMENTS = new Set(["search", "arama"]);

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
