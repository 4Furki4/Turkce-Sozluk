import {
  escapeXml,
  getWordsHubCanonicalUrl,
  getWordsLetterCanonicalUrl,
} from "@/src/lib/seo-utils";
import { TURKISH_ALPHABET } from "@/src/lib/turkish-alphabet";

export const dynamic = "force-static";

export async function GET() {
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

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
