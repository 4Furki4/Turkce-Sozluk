import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
const SW_VERSION = "v1.2.0";
console.log(`[SW] Service Worker ${SW_VERSION} starting...`);

declare const self: ServiceWorkerGlobalScope;

const EN_SEARCH_DYNAMIC_PATH = /^\/en\/search\/.+/;
const TR_SEARCH_DYNAMIC_PATH = /^\/tr\/(?:arama|search)\/.+/;

const SEARCH_PREFIXES = ["/en/search", "/tr/arama", "/tr/search"];
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

const isDocumentRequest = (request: Request) => request.destination === "document";

const startsWithAny = (pathname: string, prefixes: readonly string[]) => {
    const normalizedPathname = pathname.toLowerCase();
    return prefixes.some((prefix) => normalizedPathname.startsWith(prefix.toLowerCase()));
};

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [...defaultCache],

    fallbacks: {
        entries: [
            {
                url: "/en/search",
                matcher({ request }) {
                    if (!isDocumentRequest(request)) {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking search fallback for: ${pathname}`);

                    // Match English search pages with dynamic routes
                    if (pathname.match(EN_SEARCH_DYNAMIC_PATH)) {
                        console.log(`[SW] Serving /en/search for: ${pathname}`);
                        return true;
                    }

                    return false;
                },
            },
            {
                url: "/tr/arama",
                matcher({ request }) {
                    if (!isDocumentRequest(request)) {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking TR search fallback for: ${pathname}`);

                    if (pathname.match(TR_SEARCH_DYNAMIC_PATH)) {
                        console.log(`[SW] Serving /tr/arama for: ${pathname}`);
                        return true;
                    }

                    return false;
                },
            },
            {
                url: "/~offline",
                matcher({ request }) {
                    // Only redirect to offline page for document requests that are NOT search pages
                    // This allows search pages to load normally and use IndexedDB for offline queries
                    if (!isDocumentRequest(request)) {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking offline fallback for: ${pathname}`);

                    // Don't redirect search pages (they're handled above)
                    if (startsWithAny(pathname, SEARCH_PREFIXES)) {
                        console.log(
                            `[SW] Search page handled by other fallback: ${pathname}`,
                        );
                        return false;
                    }

                    // Allow offline dictionary page to load
                    if (startsWithAny(pathname, OFFLINE_DICTIONARY_PREFIXES)) {
                        console.log(`[SW] Allowing offline dictionary: ${pathname}`);
                        return false;
                    }

                    // Never fallback on the fallback page itself
                    if (startsWithAny(pathname, OFFLINE_PAGE_PREFIXES)) {
                        console.log(`[SW] Allowing offline page route: ${pathname}`);
                        return false;
                    }

                    // Allow home page and locale pages to load (they're precached)
                    if (pathname === "/" || pathname === "/en" || pathname === "/tr") {
                        console.log(`[SW] Allowing home/locale page: ${pathname}`);
                        return false;
                    }

                    // For all other document requests, show offline page
                    console.log(`[SW] Redirecting to offline page: ${pathname}`);
                    return true;
                },
            },
        ],
    },
    // precacheOptions: {
    //     navigateFallback: "/",
    //     navigateFallbackDenylist: [/^\/api/],
    // }
});

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
