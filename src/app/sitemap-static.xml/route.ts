import {
    INDEXABLE_STATIC_ROUTE_KEYS,
    escapeXml,
    getStaticRouteCanonicalUrl,
} from "@/src/lib/seo-utils";

export const dynamic = "force-static";

export async function GET() {
    const lastModified = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const routeKey of INDEXABLE_STATIC_ROUTE_KEYS) {
        const url = getStaticRouteCanonicalUrl(routeKey, "tr");
        xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${lastModified}</lastmod></url>\n`;
    }

    xml += "</urlset>";

    return new Response(xml, {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
}
