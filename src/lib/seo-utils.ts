/**
 * Utility functions for SEO-related operations
 */

/**
 * Get the base URL for the application with consistent logic across all files
 * This function ensures we always use the correct URL with proper protocol
 */
export function getBaseUrl(): string {
    // Production environment
    if (process.env.VERCEL_ENV === 'production') {
        return 'https://turkce-sozluk.com'; // canonical production URL
    }

    // Preview/staging environment on Vercel
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // Custom environment variable (useful for other hosting platforms)
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }

    // Local development fallback
    return 'http://localhost:3000';
}

/**
 * Generate a full absolute URL for a given path
 */
export function getAbsoluteUrl(path: string): string {
    const baseUrl = getBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Generate canonical URL for word pages based on locale
 */
export function getWordCanonicalUrl(wordName: string, locale: string): string {
    const encodedWord = encodeURIComponent(wordName);
    const path = locale === 'en' ? `/en/search/${encodedWord}` : `/arama/${encodedWord}`;
    return getAbsoluteUrl(path);
}

/**
 * Generate hreflang URLs for word pages
 */
export function getWordHreflangUrls(wordName: string) {
    const encodedWord = encodeURIComponent(wordName);
    return {
        'tr': getAbsoluteUrl(`/arama/${encodedWord}`),
        'en': getAbsoluteUrl(`/en/search/${encodedWord}`),
        'x-default': getAbsoluteUrl(`/arama/${encodedWord}`), // Turkish as default
    };
}

