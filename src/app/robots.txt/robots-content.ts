import { getBaseUrl } from "@/src/lib/seo-utils";

const WORD_SITEMAP_PAGE_COUNT = 20;
const CONTENT_SIGNAL = "Content-Signal: ai-train=no, search=yes, ai-input=no";

const DISALLOWED_PATHS = [
  "/en/dashboard/",
  "/en/dashboard/*",
  "/tr/panel/",
  "/tr/panel/*",
  "/en/complete-profile",
  "/tr/profil-tamamla",
  "/en/saved-words",
  "/tr/kaydedilen-kelimeler",
  "/en/search-history",
  "/tr/arama-gecmisi",
  "/en/my-requests",
  "/tr/isteklerim",
  "/api/",
  "/api/*",
] as const;

export function createRobotsTxt(): string {
  const baseUrl = getBaseUrl();
  const wordSitemaps = Array.from(
    { length: WORD_SITEMAP_PAGE_COUNT },
    (_, index) => `${baseUrl}/sitemap-words/sitemap/${index + 1}.xml`,
  );
  const sitemaps = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap-static.xml`,
    `${baseUrl}/sitemap-word-hubs.xml`,
    `${baseUrl}/sitemap-priority-words.xml`,
    ...wordSitemaps,
  ];

  return [
    "User-Agent: *",
    "Allow: /",
    CONTENT_SIGNAL,
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    "",
    "User-Agent: GPTBot",
    "Disallow: /",
    "",
    ...sitemaps.map((sitemap) => `Sitemap: ${sitemap}`),
    "",
  ].join("\n");
}
