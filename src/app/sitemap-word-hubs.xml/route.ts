import {
  escapeXml,
  getWordsHubCanonicalUrl,
  getWordsLetterCanonicalUrl,
} from "@/src/lib/seo-utils";
import { TURKISH_ALPHABET } from "@/src/lib/turkish-alphabet";
import { cacheLife } from "next/cache";

async function getSitemapXml() {
  "use cache";
  cacheLife("days");
  const lastModified = new Date().toISOString();
  const urls = [
    getWordsHubCanonicalUrl("tr"),
    ...TURKISH_ALPHABET.map((letter) => getWordsLetterCanonicalUrl(letter, "tr")),
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${lastModified}</lastmod></url>\n`;
  }

  xml += "</urlset>";
  return xml;
}

export async function GET() {
  return new Response(await getSitemapXml(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
