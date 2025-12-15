import { db } from "@/db";
import { words } from "@/db/schema/words";
import { getBaseUrl } from '@/src/lib/seo-utils';

const PAGE_SIZE = 5000;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Await params as per Next.js 15+ requirements
    const { id } = await params;

    // Check if id ends with .xml
    if (!id.endsWith('.xml')) {
        return new Response('Not Found', { status: 404 });
    }

    const page = parseInt(id.replace('.xml', ''), 10);
    if (isNaN(page) || page < 1) {
        return new Response('Invalid Page', { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const offset = (page - 1) * PAGE_SIZE;

    // Fetch this page's words
    const rows = await db
        .select({ name: words.name })
        .from(words)
        .orderBy(words.id)
        .offset(offset)
        .limit(PAGE_SIZE)
        .execute();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const { name } of rows) {
        const encoded = encodeURIComponent(name);
        const lastModified = new Date().toISOString();

        // 1. Turkish (x-default)
        const trUrl = `${baseUrl}/arama/${encoded}`;
        const enUrl = `${baseUrl}/en/search/${encoded}`;

        // Turkish Entry
        xml += `<url>\n`;
        xml += `  <loc>${trUrl}</loc>\n`;
        xml += `  <lastmod>${lastModified}</lastmod>\n`;
        xml += `  <changefreq>daily</changefreq>\n`;
        xml += `  <priority>0.8</priority>\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="tr" href="${trUrl}" />\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="x-default" href="${trUrl}" />\n`;
        xml += `</url>\n`;

        // English Entry
        xml += `<url>\n`;
        xml += `  <loc>${enUrl}</loc>\n`;
        xml += `  <lastmod>${lastModified}</lastmod>\n`;
        xml += `  <changefreq>daily</changefreq>\n`;
        xml += `  <priority>0.8</priority>\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="en" href="${enUrl}" />\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="tr" href="${trUrl}" />\n`;
        xml += `  <xhtml:link rel="alternate" hreflang="x-default" href="${trUrl}" />\n`;
        xml += `</url>\n`;
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        },
    });
}
