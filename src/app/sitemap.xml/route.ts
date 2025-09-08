import { db } from "@/db";
import { words } from "@/db/schema/words";
import { routing } from "@/src/i18n/routing";
import { getBaseUrl } from '@/src/lib/seo-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = getBaseUrl();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Homepage - Turkish is default
  xml += `<url><loc>${baseUrl}</loc><changefreq>daily</changefreq><priority>1.0</priority><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" /><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}" /></url>\n`;

  // English homepage
  xml += `<url><loc>${baseUrl}/en</loc><changefreq>daily</changefreq><priority>1.0</priority><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en" /><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}" /></url>\n`;

  // Static routes with proper hreflang
  Object.entries(routing.pathnames).forEach(([internal, external]) => {
    if (typeof external === 'string') return;
    const trPath = external.tr;
    const enPath = external.en;
    if (!trPath || !enPath || trPath.includes('[') || enPath.includes('[')) return;

    // Turkish version
    xml += `<url><loc>${baseUrl}${trPath}</loc><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}${trPath}" /><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en${enPath}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${trPath}" /></url>\n`;

    // English version
    xml += `<url><loc>${baseUrl}/en${enPath}</loc><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}${trPath}" /><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en${enPath}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${trPath}" /></url>\n`;
  });

  // First batch of word pages (up to 25,000)
  const rows = await db.select({ name: words.name }).from(words).limit(25000).execute();
  for (const { name } of rows) {
    const encoded = encodeURIComponent(name);
    // Turkish word page (default)
    xml += `<url><loc>${baseUrl}/arama/${encoded}</loc><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}/arama/${encoded}" /><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/search/${encoded}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/arama/${encoded}" /></url>\n`;

    // English word page
    xml += `<url><loc>${baseUrl}/en/search/${encoded}</loc><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="tr" href="${baseUrl}/arama/${encoded}" /><xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/search/${encoded}" /><xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/arama/${encoded}" /></url>\n`;
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
