import { db } from "@/db";
import { words } from "@/db/schema/words";
import { routing } from "@/src/i18n/routing";

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Homepage
  xml += `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

  // Static routes
  Object.entries(routing.pathnames).forEach(([internal, external]) => {
    if (typeof external === 'string') return;
    const trPath = external.tr;
    const enPath = external.en;
    if (!trPath || !enPath || trPath.includes('[') || enPath.includes('[')) return;
    xml += `<url><loc>${baseUrl}${trPath}</loc><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en${enPath}" /></url>\n`;
  });

  // Word pages
  const rows = await db.select({ name: words.name }).from(words).limit(49500).execute();
  for (const { name } of rows) {
    const encoded = encodeURIComponent(name);
    xml += `<url><loc>${baseUrl}/arama/${encoded}</loc><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/search/${encoded}" /></url>\n`;
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
