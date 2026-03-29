import { pathnames } from "@/src/i18n/pathnames";

export type SeoLocale = "en" | "tr";

type RouteKey = keyof typeof pathnames;
type PathParams = Record<string, string>;

export const INDEXABLE_STATIC_ROUTE_KEYS = [
    "/",
    "/search",
    "/word-list",
    "/contribute-word",
    "/announcements",
    "/feedback",
    "/terms-of-service",
    "/privacy-policy",
    "/pronunciation-voting",
    "/sik-yapilan-yanlislar",
    "/galati-meshur",
    "/flashcard-game",
    "/word-matching",
    "/word-builder",
    "/speed-round",
    "/leaderboards",
    "/foreign-term-suggestions",
] as const satisfies readonly RouteKey[];

export function getBaseUrl(): string {
    if (process.env.VERCEL_ENV === "production") {
        return "https://turkce-sozluk.com";
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    return "http://localhost:3000";
}

export function normalizePathname(pathname: string): string {
    if (!pathname) {
        return "/";
    }

    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    if (normalized.length > 1 && normalized.endsWith("/")) {
        return normalized.slice(0, -1);
    }

    return normalized;
}

export function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function getAbsoluteUrl(path: string): string {
    return `${getBaseUrl()}${normalizePathname(path)}`;
}

export function getExternalPathTemplate(routeKey: RouteKey, locale: SeoLocale): string {
    const routeValue = pathnames[routeKey];

    if (typeof routeValue === "string") {
        return routeValue;
    }

    return routeValue[locale];
}

export function prefixLocalePath(locale: SeoLocale, externalPath: string): string {
    const normalized = normalizePathname(externalPath);

    if (locale === "tr") {
        return normalized === "/" ? "/tr" : `/tr${normalized}`;
    }

    return normalized === "/" ? "/en" : `/en${normalized}`;
}

export function matchPathTemplate(template: string, pathname: string): PathParams | null {
    const normalizedTemplate = normalizePathname(template);
    const normalizedPathname = normalizePathname(pathname);
    const templateSegments = normalizedTemplate.split("/").filter(Boolean);
    const pathnameSegments = normalizedPathname.split("/").filter(Boolean);

    if (templateSegments.length !== pathnameSegments.length) {
        return null;
    }

    const params: PathParams = {};

    for (let i = 0; i < templateSegments.length; i += 1) {
        const templateSegment = templateSegments[i];
        const pathnameSegment = pathnameSegments[i];

        if (templateSegment.startsWith("[") && templateSegment.endsWith("]")) {
            params[templateSegment.slice(1, -1)] = pathnameSegment;
            continue;
        }

        if (templateSegment !== pathnameSegment) {
            return null;
        }
    }

    return params;
}

export function interpolatePathTemplate(template: string, params: PathParams = {}): string {
    const normalizedTemplate = normalizePathname(template);

    if (normalizedTemplate === "/") {
        return "/";
    }

    const resolved = normalizedTemplate
        .split("/")
        .filter(Boolean)
        .map((segment) => {
            if (segment.startsWith("[") && segment.endsWith("]")) {
                const key = segment.slice(1, -1);
                return params[key] ?? segment;
            }

            return segment;
        })
        .join("/");

    return `/${resolved}`;
}

export function getWordCanonicalPath(wordName: string, locale: SeoLocale): string {
    const encodedWord = encodeURIComponent(wordName);
    return locale === "en"
        ? `/en/search/${encodedWord}`
        : `/tr/arama/${encodedWord}`;
}

export function getWordCanonicalUrl(wordName: string, locale: SeoLocale): string {
    return getAbsoluteUrl(getWordCanonicalPath(wordName, locale));
}

export function getWordRoute(wordName: string) {
    return {
        pathname: "/search/[word]" as const,
        params: { word: encodeURIComponent(wordName) },
    };
}

export function getStaticRouteCanonicalPath(routeKey: RouteKey, locale: SeoLocale = "tr"): string {
    return prefixLocalePath(locale, getExternalPathTemplate(routeKey, locale));
}

export function getStaticRouteCanonicalUrl(routeKey: RouteKey, locale: SeoLocale = "tr"): string {
    return getAbsoluteUrl(getStaticRouteCanonicalPath(routeKey, locale));
}

type RedirectCandidate = {
    template: string;
    target: string;
};

function getRedirectCandidates(routeKey: RouteKey): RedirectCandidate[] {
    const trTemplate = getExternalPathTemplate(routeKey, "tr");
    const enTemplate = getExternalPathTemplate(routeKey, "en");
    const canonicalTrTemplate = prefixLocalePath("tr", trTemplate);
    const canonicalEnTemplate = prefixLocalePath("en", enTemplate);

    return [
        { template: trTemplate, target: canonicalTrTemplate },
        { template: enTemplate, target: canonicalTrTemplate },
        { template: prefixLocalePath("tr", enTemplate), target: canonicalTrTemplate },
        { template: prefixLocalePath("en", trTemplate), target: canonicalEnTemplate },
    ];
}

export function resolveLegacyPathRedirect(pathname: string): string | null {
    const normalizedPathname = normalizePathname(pathname);

    for (const routeKey of Object.keys(pathnames) as RouteKey[]) {
        for (const candidate of getRedirectCandidates(routeKey)) {
            const params = matchPathTemplate(candidate.template, normalizedPathname);

            if (!params) {
                continue;
            }

            const targetPath = interpolatePathTemplate(candidate.target, params);

            if (targetPath !== normalizedPathname) {
                return targetPath;
            }
        }
    }

    return null;
}

export function getCanonicalPathname(pathname: string): string {
    return resolveLegacyPathRedirect(pathname) ?? normalizePathname(pathname);
}

