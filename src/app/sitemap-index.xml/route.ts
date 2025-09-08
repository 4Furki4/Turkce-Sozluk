import { getBaseUrl } from '@/src/lib/seo-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    const baseUrl = getBaseUrl();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Main sitemap with static pages and first batch of words
    xml += `<sitemap><loc>${baseUrl}/sitemap.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n`;

    // Additional words sitemap
    xml += `<sitemap><loc>${baseUrl}/sitemap-words.xml</loc><lastmod>${new Date().toISOString()}</lastmod></sitemap>\n`;

    xml += '</sitemapindex>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}
