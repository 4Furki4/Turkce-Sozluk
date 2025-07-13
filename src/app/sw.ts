import { defaultCache, } from "@serwist/next/worker";
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
const SW_VERSION = "v1.1.0";
console.log(`[SW] Service Worker ${SW_VERSION} starting...`);

declare const self: ServiceWorkerGlobalScope;

// This is the crucial part.
// We create a NavigationRoute that will handle all navigation requests.
// If a navigation request fails (e.g., when offline), it will not
// immediately fall back to the offline page. Instead, it will try to
// serve the cached index page (`/app-shell`).

// Register the navigation route. This should be one of the first routes
// you register to ensure it correctly handles navigation.

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: {
        entries: [
            // Handle dynamic search routes by serving the base search page
            {
                url: "/en/search",
                matcher({ request }) {
                    if (request.destination !== "document") {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking search fallback for: ${pathname}`);

                    // Match English search pages with dynamic routes
                    if (pathname.match(/^\/en\/search\/.+/)) {
                        console.log(`[SW] Serving /en/search for: ${pathname}`);
                        return true;
                    }

                    return false;
                },
            },
            {
                url: "/tr/search",
                matcher({ request }) {
                    if (request.destination !== "document") {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking Turkish search fallback for: ${pathname}`);

                    // Match Turkish search pages with dynamic routes
                    if (pathname.match(/^\/tr\/search\/.+/)) {
                        console.log(`[SW] Serving /tr/search for: ${pathname}`);
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
                    if (request.destination !== "document") {
                        return false;
                    }

                    const url = new URL(request.url);
                    const pathname = url.pathname;

                    console.log(`[SW] Checking offline fallback for: ${pathname}`);

                    // Don't redirect search pages (they're handled above)
                    if (pathname.match(/^\/(en|tr)\/search/)) {
                        console.log(`[SW] Search page handled by other fallback: ${pathname}`);
                        return false;
                    }

                    // Allow offline dictionary page to load
                    if (pathname.includes('/offline-dictionary')) {
                        console.log(`[SW] Allowing offline dictionary: ${pathname}`);
                        return false;
                    }

                    // Allow home page and locale pages to load (they're precached)
                    if (pathname === '/' || pathname === '/en' || pathname === '/tr') {
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
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
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