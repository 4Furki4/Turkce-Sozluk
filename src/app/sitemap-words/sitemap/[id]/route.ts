import { db } from "@/db";
import { words } from "@/db/schema/words";
import { escapeXml, getWordCanonicalUrl } from '@/src/lib/seo-utils';
import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

const PAGE_SIZE = 5000;

const getWordsForPage = unstable_cache(
    async (page: number) => {
        const offset = (page - 1) * PAGE_SIZE;
        return await db
            .select({
                name: words.name,
                lastModified: sql<string>`max(coalesce(${words.updated_at}, ${words.created_at}))`,
            })
            .from(words)
            .groupBy(words.name)
            .orderBy(words.name)
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

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const { name, lastModified: rawLastModified } of rows) {
        const lastModified = rawLastModified
            ? new Date(rawLastModified).toISOString()
            : new Date().toISOString();
        const url = getWordCanonicalUrl(name, "tr");
        xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${lastModified}</lastmod></url>\n`;
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
        },
    });
}
