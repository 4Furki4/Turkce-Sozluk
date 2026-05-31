import { defaultCache } from "@serwist/next/worker";
import type {
    PrecacheEntry,
    RouteHandlerCallbackOptions,
    RuntimeCaching,
    SerwistGlobalConfig,
} from "serwist";
import { NavigationRoute, Serwist } from "serwist";

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

const SW_VERSION = "v1.4.0";

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
const DOCUMENT_CACHE_NAME = "document-pages";
const NAVIGATION_NETWORK_TIMEOUT_MS = 4000;
const RUNTIME_CACHING = [...defaultCache] satisfies RuntimeCaching[];
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

const getCachedNavigationResponse = async (request: Request, fallbackUrl: string) => {
    const runtimeCache = await caches.open(DOCUMENT_CACHE_NAME);
    const cachedRequest = await runtimeCache.match(request, { ignoreSearch: true });

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

const timeout = (ms: number) =>
    new Promise<undefined>((resolve) => {
        setTimeout(resolve, ms);
    });

const handleNavigationRequest = async ({
    event,
    request,
    url,
}: RouteHandlerCallbackOptions) => {
    const fetchEvent = event as FetchEvent;
    const networkResponsePromise = (async () => {
        const preloadResponse = await fetchEvent.preloadResponse;
        return preloadResponse ?? fetch(request);
    })();

    let networkResponse: Response | undefined;

    try {
        networkResponse = await Promise.race([
            networkResponsePromise,
            timeout(NAVIGATION_NETWORK_TIMEOUT_MS),
        ]);
    } catch (error) {
        console.warn(
            `[SW] Navigation request failed; serving cached fallback for ${url.pathname}`,
            error,
        );
    }

    if (networkResponse && isUsableNavigationResponse(networkResponse)) {
        event.waitUntil(
            cacheNavigationResponse(request, Promise.resolve(networkResponse.clone())),
        );
        return networkResponse;
    }

    event.waitUntil(cacheNavigationResponse(request, networkResponsePromise));

    if (networkResponse) {
        console.warn(
            `[SW] Navigation returned ${networkResponse.status}; serving cached fallback for ${url.pathname}`,
        );
    } else {
        console.warn(
            `[SW] Navigation timed out; serving cached fallback for ${url.pathname}`,
        );
    }

    const cachedResponse = await getCachedNavigationResponse(
        request,
        getNavigationFallbackUrl(url),
    );

    if (cachedResponse) {
        return cachedResponse;
    }

    if (networkResponse) {
        return networkResponse;
    }

    try {
        const lateNetworkResponse = await networkResponsePromise;
        return lateNetworkResponse ?? Response.error();
    } catch {
        return Response.error();
    }
};

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    // precacheOptions: {
    //     navigateFallback: "/",
    //     navigateFallbackDenylist: [/^\/api/],
    // }
});

serwist.registerRoute(
    new NavigationRoute(handleNavigationRequest, {
        denylist: NAVIGATION_DENYLIST,
    }),
);

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
