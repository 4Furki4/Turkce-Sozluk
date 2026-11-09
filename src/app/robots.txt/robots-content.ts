import { getBaseUrl } from "@/src/lib/seo-utils";

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
  return [
    "User-Agent: *",
    "Allow: /",
    CONTENT_SIGNAL,
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
    "",
    "User-Agent: GPTBot",
    "Disallow: /",
    "",
    `Sitemap: ${getBaseUrl()}/sitemap.xml`,
    "",
  ].join("\n");
}
