// src/app/sitemap-static.xml/route.ts

import { routing } from '@/src/i18n/routing';
import { getBaseUrl } from '@/src/lib/seo-utils';
import { MetadataRoute } from 'next';

// Helper function to check if a value is a valid pathname object
function isValidPathname(value: any): value is { en: string; tr: string } {
    return typeof value === 'object' && value !== null &&
        typeof value.en === 'string' && typeof value.tr === 'string';
}

function getStaticSitemap(): MetadataRoute.Sitemap {
    const baseUrl = getBaseUrl();
    const lastModified = new Date().toISOString();
    const pathnames = routing.pathnames;

    const createLocaleEntries = (path: { en: string; tr: string; }, priority: number = 0.8, changeFrequency: 'daily' | 'monthly' | 'yearly' = 'monthly') => {

        // Handle homepage case: if path is '/', use an empty string
        const trPath = path.tr === '/' ? '' : path.tr;
        const enPath = path.en === '/' ? '' : path.en;

        return [
            {
                url: `${baseUrl}${trPath}`, // Turkish (default)
                lastModified,
                changeFrequency,
                priority,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en${enPath}`,
                        tr: `${baseUrl}${trPath}`,
                        'x-default': `${baseUrl}${trPath}`,
                    },
                },
            },
            {
                url: `${baseUrl}/en${enPath}`, // English
                lastModified,
                changeFrequency,
                priority,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en${enPath}`,
                        tr: `${baseUrl}${trPath}`,
                        'x-default': `${baseUrl}${trPath}`,
                    },
                },
            },
        ];
    };

    // --- THIS IS THE FIX ---
    // 1. Manually add the homepage with top priority
    const sitemapEntries: MetadataRoute.Sitemap = [
        ...createLocaleEntries({ en: '/', tr: '/' }, 1.0, 'daily')
    ];

    // 2. Loop through all other pages
    Object.entries(pathnames)
        .filter(([key, _]) => {
            const isDynamic = key.includes('[') || key.includes(']');
            const isDashboard = key.startsWith('/panel') || key.startsWith('/dashboard');
            // Exclude the homepage key, since we just added it
            const isHome = key === '/';

            return !isDynamic && !isDashboard && !isHome;
        })
        .forEach(([key, pathname]) => {
            if (isValidPathname(pathname)) {

                let priority = 0.8;
                let freq: 'daily' | 'monthly' | 'yearly' = 'monthly';

                if (key.includes('policy') || key.includes('service')) {
                    priority = 0.3;
                    freq = 'yearly';
                }

                sitemapEntries.push(...createLocaleEntries(pathname, priority, freq));
            } else {
                console.warn(`Sitemap: Skipping invalid pathname for key '${key}':`, pathname);
            }
        });

    return sitemapEntries;
}

// GET handler remains the same

export const dynamic = 'force-static';

export async function GET() {
    const sitemapEntries = getStaticSitemap();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const entry of sitemapEntries) {
        if (!entry.url.includes('undefined')) {
            xml += `<url><loc>${entry.url}</loc><lastmod>${entry.lastModified}</lastmod><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority>\n`;

            if (entry.alternates?.languages) {
                for (const [lang, href] of Object.entries(entry.alternates.languages)) {
                    xml += `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />\n`;
                }
            }
            xml += `</url>\n`;
        }
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}