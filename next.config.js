const createNextIntlPlugin = require('next-intl/plugin');
const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
} = require("next/constants");

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ["utfs.io", "bcpoot6w02.ufs.sh"],
    }
};


const config = withNextIntl(nextConfig);

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
    /** @type {import("next").NextConfig} */
    /** @type {import('next').NextConfig} */
    const nextConfig = {
        images: {
            domains: ["utfs.io", "bcpoot6w02.ufs.sh"],
        }
    };

    const revision = crypto.randomUUID();
    const nextIntlConfig = withNextIntl(nextConfig);

    if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
        const withSerwist = (await import("@serwist/next")).default({
            swSrc: "src/app/sw.ts",
            swDest: "public/sw.js",
            cacheOnNavigation: true,
            reloadOnOnline: true,
            additionalPrecacheEntries: [
                { url: "/~offline", revision },
                // Precache the main entry points to avoid the redirect issue
                { url: "/", revision },
                { url: "/en", revision },
                // Precache search pages for offline functionality
                { url: "/en/search", revision },
                { url: "/tr/arama", revision },
                // Precache offline dictionary page
                { url: "/en/offline-dictionary", revision },
                { url: "/tr/offline-dictionary", revision },
            ],

        });
        return withSerwist(nextIntlConfig);
    }

    return nextIntlConfig;
};

