import { escapeXml, getBaseUrl } from '@/src/lib/seo-utils';
import {
  getIndexableWordCount,
  WORD_SITEMAP_PAGE_SIZE,
} from '@/src/lib/seo-word-index';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = getBaseUrl();

  // Fetch total count to calculate archive chunks. If the database is
  // unavailable, still return the crawl-priority sitemaps instead of failing
  // builds or returning a 500 to crawlers.
  const totalWords = await getIndexableWordCount().catch((error) => {
    console.error("Failed to generate word sitemap index entries", error);
    return 0;
  });
  const totalPages = Math.ceil(totalWords / WORD_SITEMAP_PAGE_SIZE);

  const sitemapPaths = [
    "/sitemap-static.xml",
    "/sitemap-word-hubs.xml",
    "/sitemap-priority-words.xml",
    ...Array.from({ length: totalPages }, (_, index) => `/sitemap-words/sitemap/${index + 1}.xml`),
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const path of sitemapPaths) {
    xml += `<sitemap><loc>${escapeXml(`${baseUrl}${path}`)}</loc></sitemap>\n`;
  }

  xml += '</sitemapindex>';

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
