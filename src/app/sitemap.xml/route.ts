import { getBaseUrl } from '@/src/lib/seo-utils';
import {
  getIndexableWordCount,
  WORD_SITEMAP_PAGE_SIZE,
} from '@/src/lib/seo-word-index';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = getBaseUrl();
  const lastmod = new Date().toISOString();

  // Fetch total count to calculate archive chunks. If the database is
  // unavailable, still return the crawl-priority sitemaps instead of failing
  // builds or returning a 500 to crawlers.
  const totalWords = await getIndexableWordCount().catch((error) => {
    console.error("Failed to generate word sitemap index entries", error);
    return 0;
  });
  const totalPages = Math.ceil(totalWords / WORD_SITEMAP_PAGE_SIZE);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 1. Point to the static sitemap
  xml += `<sitemap><loc>${baseUrl}/sitemap-static.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

  // 2. Point to crawl-priority dictionary discovery sitemaps before the full archive
  xml += `<sitemap><loc>${baseUrl}/sitemap-word-hubs.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;
  xml += `<sitemap><loc>${baseUrl}/sitemap-priority-words.xml</loc><lastmod>${lastmod}</lastmod></sitemap>\n`;

  // 3. Point to the sitemap-words chunks directly
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
