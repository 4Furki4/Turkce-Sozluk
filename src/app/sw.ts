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
const SW_VERSION = "v1.1.0";
console.log(`[SW] Service Worker ${SW_VERSION} starting...`);

declare const self: ServiceWorkerGlobalScope;

// --- 1. NEW CUSTOM HANDLER ---
// This handler checks if the user is offline. If they are,
// it redirects any request for a Turkish search page
// to the equivalent English search page, which we know works offline.
const offlineTrRedirectHandler = async ({ request }: { request: Request }) => {
    // Check if we are online.
    if (navigator.onLine) {
        // We are online. Let the request proceed as normal.
        // It will be handled by the default cache or network.
        try {
            return await fetch(request);
        } catch (e) {
            // If network fails (even if "online"), fall through to fallbacks
            return new Response("", { status: 500 });
        }
    }

    // We are OFFLINE.
    // Construct the new URL.
    const url = new URL(request.url);
    // Get the word from the path, e.g., "ahlak" from "/tr/arama/ahlak"
    const word = url.pathname.split("/").pop();

    // Handle base path /tr/arama as well, redirect to /en/search
    if (!word) {
        const newUrl = "/en/search";
        console.warn(
            `[SW] Offline TR base path. Redirecting ${url.pathname} to ${newUrl}`,
        );
        return Response.redirect(newUrl, 302);
    }

    const newUrl = `/en/search/${word}`;

    console.warn(
        `[SW] Offline /tr request. Redirecting ${url.pathname} to ${newUrl}`,
    );

    // Return a Redirect Response.
    // The browser will follow this and make a new request
    // for /en/search/ahlak, which Fallback 1 will
    // handle correctly.
    return Response.redirect(newUrl, 302);
};
// --- END NEW HANDLER ---

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,

    // --- 2. THIS IS THE MAIN FIX ---
    // We replace `runtimeCaching: defaultCache` with our own array.
    // We put our custom rule FIRST, then spread the `defaultCache`.
    runtimeCaching: [
        {
            // This rule intercepts navigation requests to ANY Turkish search path.
            matcher: ({ request, url }) =>
                request.destination === "document" &&
                url.pathname.startsWith("/tr/arama"),
            handler: offlineTrRedirectHandler, // Use our new custom handler
        },
        ...defaultCache, // Include all the default caching rules
    ],
    // --- END MAIN FIX ---

    fallbacks: {
        entries: [
            // Fallback 1: English (This one works perfectly, leave it)
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
            // --- 3. REMOVE FLAWED TURKISH FALLBACK ---
            // This entry is now redundant because our `runtimeCaching`
            // rule above will always catch the request first.
            // We remove it to avoid conflicts.
            //
            // {
            //   url: "/tr/arama",
            //   matcher({ request }) { ... },
            // },
            // --- END REMOVAL ---
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
                    if (
                        pathname.includes("/tr/arama") ||
                        pathname.includes("/en/search")
                    ) {
                        console.log(
                            `[SW] Search page handled by other fallback: ${pathname}`,
                        );
                        return false;
                    }

                    // Allow offline dictionary page to load
                    if (pathname.includes("/offline-dictionary")) {
                        console.log(`[SW] Allowing offline dictionary: ${pathname}`);
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