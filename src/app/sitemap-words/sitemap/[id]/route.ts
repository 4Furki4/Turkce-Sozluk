import { db } from "@/db";
import { words } from "@/db/schema/words";
import { getBaseUrl } from '@/src/lib/seo-utils';
import { unstable_cache } from "next/cache";

const PAGE_SIZE = 5000;

const getWordsForPage = unstable_cache(
    async (page: number) => {
        const offset = (page - 1) * PAGE_SIZE;
        return await db
            .select({ name: words.name })
            .from(words)
            .orderBy(words.id)
            .offset(offset)
            .limit(PAGE_SIZE)
            .execute();
    },
    ['sitemap-words-page'],
    { revalidate: 86400 } // 24 hours
);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Await params as per Next.js 15+ requirements
    const { id } = await params;

    // Check if id ends with .xml
    if (!id.endsWith('.xml')) {
        return new Response('Not Found', { status: 404 });
    }

    // Strip .xml and parse integer
    const page = parseInt(id.replace('.xml', ''), 10);
    if (isNaN(page) || page < 1) {
        return new Response('Invalid Page', { status: 400 });
    }

    // Fetch this page's words from cache
    const rows = await getWordsForPage(page);

    const baseUrl = getBaseUrl();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const { name } of rows) {
        const encoded = encodeURIComponent(name);
        const lastModified = new Date().toISOString();

        // 1. Turkish (x-default)
        const trUrl = `${baseUrl}/arama/${encoded}`;
        const enUrl = `${baseUrl}/en/search/${encoded}`;

        // Turkish Entry
        xml += `<url><loc>${trUrl}</loc><lastmod>${lastModified}</lastmod><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="en" href="${enUrl}" /><xhtml:link rel="alternate" hreflang="tr" href="${trUrl}" /><xhtml:link rel="alternate" hreflang="x-default" href="${trUrl}" /></url>\n`;

        // English Entry
        xml += `<url><loc>${enUrl}</loc><lastmod>${lastModified}</lastmod><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="en" href="${enUrl}" /><xhtml:link rel="alternate" hreflang="tr" href="${trUrl}" /><xhtml:link rel="alternate" hreflang="x-default" href="${trUrl}" /></url>\n`;
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            // Keep browser caching but reduce s-maxage to rely on next/cache revalidation
            'Cache-Control': 'public, max-age=86400'
        },
    });
}
