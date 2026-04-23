const createNextIntlPlugin = require('next-intl/plugin');
const {
    PHASE_PRODUCTION_BUILD,
} = require("next/constants");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // Keep metadata in the initial <head> for all HTML user agents instead of
    // streaming it into the body. This makes curl/view-source match crawler HTML.
    htmlLimitedBots: /.*/,

    // RAM Saving Configurations
    productionBrowserSourceMaps: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        webpackBuildWorker: true,
    },

    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'utfs.io',
            },
            {
                protocol: 'https',
                hostname: 'bcpoot6w02.ufs.sh',
            },
        ],
    }
};

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
    const revision = crypto.randomUUID();
    const nextIntlConfig = withNextIntl(nextConfig);

    // Keep the service worker out of local development to avoid stale localhost
    // caches masking routing changes and causing browser-only redirect loops.
    if (phase === PHASE_PRODUCTION_BUILD) {
        const withSerwist = (await import("@serwist/next")).default({
            swSrc: "src/app/sw.ts",
            swDest: "public/sw.js",
            cacheOnNavigation: true,
            reloadOnOnline: true,
            additionalPrecacheEntries: [
                { url: "/~offline", revision },
                { url: "/en/~offline", revision },
                { url: "/tr/~%C3%A7evrim-d%C4%B1%C5%9F%C4%B1", revision },
                // Precache the main entry points to avoid the redirect issue
                { url: "/", revision },
                { url: "/en", revision },
                { url: "/tr", revision },
                // Precache search pages for offline functionality
                { url: "/en/search", revision },
                { url: "/tr/arama", revision },
                // Precache offline dictionary page
                { url: "/en/offline-dictionary", revision },
                { url: "/tr/offline-dictionary", revision },
                { url: "/tr/%C3%A7evrim-d%C4%B1%C5%9F%C4%B1-s%C3%B6zl%C3%BCk", revision },
            ],

        });
        return withSerwist(nextIntlConfig);
    }

    return nextIntlConfig;
};
