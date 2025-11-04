// src/app/sitemap.xml/route.ts

import { getBaseUrl } from '@/src/lib/seo-utils';

export async function GET() {
    const baseUrl = getBaseUrl();
    const lastmod = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Point to the static sitemap
    xml += `<sitemap><loc>${baseUrl}/sitemap-static.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

    // 2. Point to the sitemap-words index (which Next.js generates for you)
    xml += `<sitemap><loc>${baseUrl}/sitemap-words-index.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

    xml += '</sitemapindex>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}