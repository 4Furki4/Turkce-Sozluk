import { db } from '@/db';
import { words } from '@/db/schema/words';
import { getBaseUrl } from '@/src/lib/seo-utils';
import { count } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

const PAGE_SIZE = 5000;

const getWordCount = unstable_cache(
  async () => {
    const totalResult = await db.select({ count: count() }).from(words).execute();
    return totalResult[0].count;
  },
  ['sitemap-word-count'],
  { revalidate: 86400 } // 24 hours
);

export async function GET() {
  const baseUrl = getBaseUrl();
  const lastmod = new Date().toISOString();

  // Fetch total count to calculate pages using cached function
  const totalWords = await getWordCount();
  const totalPages = Math.ceil(totalWords / PAGE_SIZE);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 1. Point to the static sitemap
  xml += `<sitemap><loc>${baseUrl}/sitemap-static.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

  // 2. Point to the sitemap-words chunks directly
  for (let i = 1; i <= totalPages; i++) {
    // User preferred format: /sitemap-words/sitemap/1.xml
    // CRITICAL: No whitespace between tags
    xml += `<sitemap><loc>${baseUrl}/sitemap-words/sitemap/${i}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;
  }

  xml += '</sitemapindex>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}