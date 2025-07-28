import { db } from "@/db";
import { words } from "@/db/schema/words";

export const dynamic = 'force-dynamic';

export async function GET() {
    // Dynamic URL logic consistent with other sitemaps
    let baseUrl;
    if (process.env.VERCEL_ENV === 'production') {
        baseUrl = 'https://turkce-sozluk.com'; // canonical production URL
    } else if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`; // Preview URLs
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
        baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
        baseUrl = 'http://localhost:3000'; // Local development fallback
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    // Additional word pages (offset 25,000, limit 25,000)
    const rows = await db.select({ name: words.name }).from(words).offset(25000).limit(25000).execute();
    for (const { name } of rows) {
        const encoded = encodeURIComponent(name);
        xml += `<url><loc>${baseUrl}/arama/${encoded}</loc><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/search/${encoded}" /></url>\n`;
    }

    xml += '</urlset>';

    return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
    });
}
