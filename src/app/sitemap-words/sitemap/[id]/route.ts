import { escapeXml, getWordCanonicalUrl } from '@/src/lib/seo-utils';
import { getIndexableWordsForSitemapPage } from '@/src/lib/seo-word-index';

export const dynamic = 'force-dynamic';

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
    const rows = await getIndexableWordsForSitemapPage(page);

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
