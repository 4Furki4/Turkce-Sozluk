// src/app/sitemap-static.xml/route.ts

import { getBaseUrl } from '@/src/lib/seo-utils';
import { MetadataRoute } from 'next';

// This is the same sitemap generation code you wrote before
function getStaticSitemap(): MetadataRoute.Sitemap {
    const baseUrl = getBaseUrl();
    const lastModified = new Date().toISOString();

    const createLocaleEntries = (path: string, priority: number = 0.8, changeFrequency: 'daily' | 'monthly' | 'yearly' = 'monthly') => {
        return [
            {
                url: `${baseUrl}${path}`, // Turkish (default)
                lastModified,
                changeFrequency,
                priority,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en${path}`,
                        tr: `${baseUrl}${path}`,
                        'x-default': `${baseUrl}${path}`,
                    },
                },
            },
            {
                url: `${baseUrl}/en${path}`, // English
                lastModified,
                changeFrequency,
                priority,
                alternates: {
                    languages: {
                        en: `${baseUrl}/en${path}`,
                        tr: `${baseUrl}${path}`,
                        'x-default': `${baseUrl}${path}`,
                    },
                },
            },
        ];
    };
    const staticPages = [
        { path: '/', priority: 1.0, freq: 'daily' as const },
        { path: '/announcements', priority: 0.7, freq: 'weekly' as const },
        { path: '/contribute-word', priority: 0.5, freq: 'monthly' as const },
        { path: '/feedback', priority: 0.5, freq: 'monthly' as const },
        { path: '/my-requests', priority: 0.5, freq: 'monthly' as const },
        { path: '/offline-dictionary', priority: 0.6, freq: 'monthly' as const },
        { path: '/privacy-policy', priority: 0.3, freq: 'yearly' as const },
        { path: '/pronunciation-voting', priority: 0.5, freq: 'weekly' as const },
        { path: '/saved-words', priority: 0.5, freq: 'monthly' as const },
        { path: '/search-history', priority: 0.5, freq: 'monthly' as const },
        { path: '/signin', priority: 0.4, freq: 'monthly' as const },
        { path: '/terms-of-service', priority: 0.3, freq: 'yearly' as const },
        { path: '/word-list', priority: 0.6, freq: 'daily' as const },
    ];

    // Create entries for all static pages in both locales
    const sitemapEntries = staticPages.flatMap(page =>
        createLocaleEntries(page.path, page.priority, page.freq as 'daily' | 'monthly' | 'yearly')
    );
    return sitemapEntries;
}

// We just wrap it in a GET handler
export async function GET() {
    const baseUrl = getBaseUrl();
    const sitemapEntries = getStaticSitemap();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const entry of sitemapEntries) {
        xml += `<url><loc>${entry.url}</loc><lastmod>${entry.lastModified}</lastmod><changefreq>${entry.changeFrequency}</changefreq><priority>${entry.priority}</priority>\n`;

        // Add alternates if they exist
        if (entry.alternates?.languages) {
            for (const [lang, href] of Object.entries(entry.alternates.languages)) {
                xml += `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />\n`;
            }
        }
        xml += `</url>\n`;
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}