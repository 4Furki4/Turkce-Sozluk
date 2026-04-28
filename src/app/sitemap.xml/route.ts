import { db } from '@/db';
import { words } from '@/db/schema/words';
import {
  INDEXABLE_STATIC_ROUTE_KEYS,
  escapeXml,
  getStaticRouteCanonicalUrl,
  getWordCanonicalUrl,
} from '@/src/lib/seo-utils';
import { sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

const MAIN_SITEMAP_WORD_LIMIT = 49000;

const getMainSitemapWords = unstable_cache(
  async () => {
    return await db
      .select({
        name: words.name,
        lastModified: sql<string>`max(coalesce(${words.updated_at}, ${words.created_at}))`,
      })
      .from(words)
      .groupBy(words.name)
      .orderBy(words.name)
      .limit(MAIN_SITEMAP_WORD_LIMIT)
      .execute();
  },
  ['main-sitemap-words'],
  { revalidate: 86400 } // 24 hours
);

export async function GET() {
  const lastModified = new Date().toISOString();
  const wordRows = await getMainSitemapWords();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const routeKey of INDEXABLE_STATIC_ROUTE_KEYS) {
    const url = getStaticRouteCanonicalUrl(routeKey, "tr");
    xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${lastModified}</lastmod></url>\n`;
  }

  for (const { name, lastModified: rawLastModified } of wordRows) {
    const wordLastModified = rawLastModified
      ? new Date(rawLastModified).toISOString()
      : lastModified;
    const url = getWordCanonicalUrl(name, "tr");
    xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${wordLastModified}</lastmod></url>\n`;
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
