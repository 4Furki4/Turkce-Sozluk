import { defaultCache, PAGES_CACHE_NAME } from "@serwist/next/worker";
import type {
    PrecacheEntry,
    RouteHandlerCallbackOptions,
    RuntimeCaching,
    SerwistGlobalConfig,
} from "serwist";
import { CacheExpiration, NavigationRoute, NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

// Service Worker version for debugging

const SW_VERSION = "v1.6.5";

console.log(`[SW] Service Worker ${SW_VERSION} starting...`);

declare const self: ServiceWorkerGlobalScope;

const EN_SEARCH_DYNAMIC_PATH = /^\/en\/search\/.+/;
const TR_SEARCH_DYNAMIC_PATH = /^\/tr\/(?:arama|search)\/.+/;

const OFFLINE_DICTIONARY_PREFIXES = [
    "/en/offline-dictionary",
    "/tr/offline-dictionary",
    "/tr/%C3%A7evrim-d%C4%B1%C5%9F%C4%B1-s%C3%B6zl%C3%BCk",
];
const OFFLINE_PAGE_PREFIXES = [
    "/~offline",
    "/en/~offline",
    "/tr/~%C3%A7evrim-d%C4%B1%C5%9F%C4%B1",
];
// The build injects a new revision for /tr into the precache manifest.
// Runtime HTML must belong to the same release as its JavaScript assets.
const precacheEntries = self.__SW_MANIFEST;
const documentRevision = precacheEntries?.find((entry) =>
    typeof entry !== "string" && entry.url === "/tr",
);
const RELEASE_REVISION =
    documentRevision && typeof documentRevision !== "string"
        ? documentRevision.revision ?? SW_VERSION
        : SW_VERSION;
const DOCUMENT_CACHE_NAME = `document-pages-${RELEASE_REVISION}`;
const PAGE_CACHE_NAMES = Object.values(PAGES_CACHE_NAME);
// Preserve the default strategies and plugins, but never share page payloads
// across releases. Offline RSC responses must match the active app bundle.
for (const cacheEntry of defaultCache) {
    const handler = cacheEntry.handler;
    if (typeof handler === "object" && handler !== null && "cacheName" in handler &&
        typeof handler.cacheName === "string" &&
        PAGE_CACHE_NAMES.some((name) => name === handler.cacheName)) {
        handler.cacheName = `${handler.cacheName}-${RELEASE_REVISION}`;
    }
}
const RUNTIME_CACHING = [
    {
        matcher: ({ url, sameOrigin }) => sameOrigin && (
            url.pathname === "/api/autocomplete-words" ||
            (url.pathname.startsWith("/api/trpc/") && url.pathname.slice("/api/trpc/".length).split(",").some((path) =>
                ["word.getWord", "word.getAllWordNames", "word.getAutocompleteListVersion", "word.getFilterOptions", "search.getWords"].includes(path),
            ))
        ),
        // Online freshness is bounded by the application cache. Offline snapshots
        // live in IndexedDB and must not be replaced with an older HTTP response.
        handler: new NetworkOnly(),
    },
    ...defaultCache,
] satisfies RuntimeCaching[];
const NAVIGATION_DENYLIST = [
    /^\/api(?:\/|$)/,
    /^\/_next(?:\/|$)/,
    /^\/_vercel(?:\/|$)/,
    /^\/sw\.js$/,
    /^\/swe-worker-[^/]+\.js$/,
];

const startsWithAny = (pathname: string, prefixes: readonly string[]) => {
    const normalizedPathname = pathname.toLowerCase();
    return prefixes.some((prefix) => normalizedPathname.startsWith(prefix.toLowerCase()));
};

const isDynamicSearchPath = (pathname: string) =>
    pathname.match(EN_SEARCH_DYNAMIC_PATH) || pathname.match(TR_SEARCH_DYNAMIC_PATH);

const isBaseSearchPath = (pathname: string) =>
    pathname === "/en/search" ||
    pathname === "/tr/arama" ||
    pathname === "/tr/search";

const isSearchQueryNavigation = (url: URL) =>
    isBaseSearchPath(url.pathname) &&
    (url.searchParams.has("word") || url.searchParams.has("offlineWord"));

const getSearchQueryRedirectUrl = (url: URL) => {
    if (!isSearchQueryNavigation(url)) {
        return null;
    }

    const rawWord = url.searchParams.get("word") ?? url.searchParams.get("offlineWord") ?? "";
    const word = rawWord.replace(/\s+/g, " ").trim();

    if (!word || word.includes("_")) {
        return null;
    }

    const redirectUrl = new URL(url.href);
    redirectUrl.pathname = `${url.pathname.replace(/\/$/, "")}/${encodeURIComponent(word)}`;
    redirectUrl.search = "";
    redirectUrl.hash = "";
    return redirectUrl;
};

const isHomeShellPath = (pathname: string) =>
    pathname === "/" || pathname === "/tr" || pathname === "/en";

const isAppShellNavigationPath = (pathname: string) =>
    isHomeShellPath(pathname) ||
    isBaseSearchPath(pathname) ||
    Boolean(isDynamicSearchPath(pathname)) ||
    startsWithAny(pathname, OFFLINE_DICTIONARY_PREFIXES);

const getNavigationFallbackUrl = (url: URL) => {
    const pathname = url.pathname;

    if (pathname.match(EN_SEARCH_DYNAMIC_PATH) || pathname === "/en/search") {
        return "/en/search";
    }

    if (
        pathname.match(TR_SEARCH_DYNAMIC_PATH) ||
        pathname === "/tr/arama" ||
        pathname === "/tr/search"
    ) {
        return "/tr/arama";
    }

    if (pathname === "/" || pathname === "/tr") {
        return "/tr";
    }

    if (pathname === "/en") {
        return "/en";
    }

    if (startsWithAny(pathname, OFFLINE_DICTIONARY_PREFIXES)) {
        return pathname.startsWith("/en")
            ? "/en/offline-dictionary"
            : "/tr/%C3%A7evrim-d%C4%B1%C5%9F%C4%B1-s%C3%B6zl%C3%BCk";
    }

    if (startsWithAny(pathname, OFFLINE_PAGE_PREFIXES)) {
        return pathname;
    }

    return pathname.startsWith("/en")
        ? "/en/~offline"
        : "/tr/~%C3%A7evrim-d%C4%B1%C5%9F%C4%B1";
};

const isUsableNavigationResponse = (response: Response) => response.ok;

const cacheNavigationResponse = async (
    request: Request,
    responsePromise: Promise<Response | undefined>,
) => {
    try {
        const url = new URL(request.url);
        if (isDynamicSearchPath(url.pathname)) {
            return;
        }

        const response = await responsePromise;

        if (!response || !isUsableNavigationResponse(response)) {
            return;
        }

        const cache = await caches.open(DOCUMENT_CACHE_NAME);
        await cache.put(request, response.clone());
    } catch (error) {
        console.warn("[SW] Failed to cache navigation response:", error);
    }
};

const getCachedNavigationResponse = async (
    request: Request,
    fallbackUrl: string,
    options: { skipRequestMatch?: boolean } = {},
) => {
    const runtimeCache = await caches.open(DOCUMENT_CACHE_NAME);
    const cachedRequest = options.skipRequestMatch
        ? undefined
        : await runtimeCache.match(request, { ignoreSearch: true });

    if (cachedRequest) {
        return cachedRequest;
    }

    const cachedRuntimeFallback = await runtimeCache.match(fallbackUrl, {
        ignoreSearch: true,
    });

    if (cachedRuntimeFallback) {
        return cachedRuntimeFallback;
    }

    const precachedFallback = await serwist.matchPrecache(fallbackUrl);

    if (precachedFallback) {
        return precachedFallback;
    }

    return caches.match(fallbackUrl, { ignoreSearch: true });
};

const handleNavigationRequest = async ({
    event,
    request,
    url,
}: RouteHandlerCallbackOptions) => {
    const searchQueryRedirectUrl = getSearchQueryRedirectUrl(url);

    if (searchQueryRedirectUrl) {
        return Response.redirect(searchQueryRedirectUrl, 307);
    }

    const fallbackUrl = getNavigationFallbackUrl(url);
    const isShellNavigation =
        isAppShellNavigationPath(url.pathname) && !isSearchQueryNavigation(url);
    const skipRequestMatch = Boolean(isDynamicSearchPath(url.pathname));
    if (isShellNavigation && !self.navigator.onLine) {
        const cachedShell = await getCachedNavigationResponse(request, fallbackUrl, {
            skipRequestMatch,
        });

        if (cachedShell) {
            return cachedShell;
        }
    }

    const networkResponsePromise = fetch(request);

    let networkResponse: Response | undefined;

    try {
        networkResponse = await networkResponsePromise;
    } catch (error) {
        console.warn(
            `[SW] Navigation request failed; serving cached fallback for ${url.pathname}`,
            error,
        );
    }

    if (networkResponse) {
        if (isUsableNavigationResponse(networkResponse)) {
            event.waitUntil(
                cacheNavigationResponse(request, Promise.resolve(networkResponse.clone())),
            );
        }

        return networkResponse;
    }

    const cachedResponse = await getCachedNavigationResponse(
        request,
        fallbackUrl,
        { skipRequestMatch },
    );

    if (cachedResponse) {
        return cachedResponse;
    }

    return Response.error();
};

const serwist = new Serwist({
    precacheEntries,
    skipWaiting: false,
    clientsClaim: true,
    // precacheOptions: {
    //     navigateFallback: "/",
    //     navigateFallbackDenylist: [/^\/api/],
    // }
});

self.addEventListener("activate", (event) => {
    const pageCacheFamilies = ["document-pages", ...PAGE_CACHE_NAMES];
    const currentPageCaches = new Set(pageCacheFamilies.map((name) => `${name}-${RELEASE_REVISION}`));
    event.waitUntil(
        caches.keys().then((names) => Promise.all(
            names.filter((name) =>
                !currentPageCaches.has(name) && pageCacheFamilies.some((family) =>
                    name === family || name.startsWith(`${family}-`),
                ),
            ).map(async (name) => {
                await caches.delete(name);
                if (PAGE_CACHE_NAMES.some((family) => name === family || name.startsWith(`${family}-`))) {
                    // delete() clears only this cache's expiration records.
                    await new CacheExpiration(name, { maxEntries: 32 }).delete();
                }
            }),
        )),
    );
});

// Serwist registers its precache route first. Handle documents before it so an
// online WebKit reload can get fresh HTML even when the URL was precached.
serwist.routes.get("GET")!.unshift(
    new NavigationRoute(handleNavigationRequest, {
        denylist: NAVIGATION_DENYLIST,
    }),
);

self.addEventListener("message", (event) => {
    if (event.data?.type === "GET_PWA_RELEASE") {
        event.ports[0]?.postMessage(RELEASE_REVISION);
    }
});

for (const cacheEntry of RUNTIME_CACHING) {
    serwist.registerCapture(cacheEntry.matcher, cacheEntry.handler, cacheEntry.method);
}

self.addEventListener("push", (event) => {
    const data = JSON.parse(event.data?.text() ?? '{ title: "" }');
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.message,
            icon: "/icons/logo.svg",
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    let client = clientList[0];
                    for (let i = 0; i < clientList.length; i++) {
                        if (clientList[i].focused) {
                            client = clientList[i];
                        }
                    }
                    return client.focus();
                }
                return self.clients.openWindow("/");
            }),
    );
});

serwist.addEventListeners();
