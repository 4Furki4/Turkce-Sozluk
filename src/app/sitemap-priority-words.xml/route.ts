import { escapeXml, getWordCanonicalUrl } from "@/src/lib/seo-utils";
import {
  getEditorialWords,
  getPriorityWords,
  PRIORITY_WORD_LIMIT,
} from "@/src/lib/seo-word-index";

export const dynamic = "force-dynamic";

export async function GET() {
  const [editorial, priority] = await Promise.all([
    getEditorialWords().catch((error) => {
      console.error("Failed to read editorial words for the sitemap", error);
      return [];
    }),
    getPriorityWords(PRIORITY_WORD_LIMIT).catch((error) => {
      console.error("Failed to generate priority word sitemap", error);
      return [];
    }),
  ]);
  const names = new Set([...editorial, ...priority].map(({ name }) => name));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const name of [...names].slice(0, PRIORITY_WORD_LIMIT)) {
    const url = getWordCanonicalUrl(name, "tr");
    xml += `<url><loc>${escapeXml(url)}</loc></url>\n`;
  }

  xml += "</urlset>";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
