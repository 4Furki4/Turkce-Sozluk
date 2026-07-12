import { escapeXml, getWordCanonicalUrl } from "@/src/lib/seo-utils";
import {
  getPriorityWords,
  getSeoWordLastModified,
  PRIORITY_WORD_LIMIT,
} from "@/src/lib/seo-word-index";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getPriorityWords(PRIORITY_WORD_LIMIT).catch((error) => {
    console.error("Failed to generate priority word sitemap", error);
    return [];
  });

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const word of rows) {
    const url = getWordCanonicalUrl(word.name, "tr");
    xml += `<url><loc>${escapeXml(url)}</loc><lastmod>${getSeoWordLastModified(word)}</lastmod></url>\n`;
  }

  xml += "</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
