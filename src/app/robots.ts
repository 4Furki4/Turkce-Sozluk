import { MetadataRoute } from "next";
import { getBaseUrl } from '@/src/lib/seo-utils';

const WORD_SITEMAP_PAGE_COUNT = 20;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const wordSitemaps = Array.from(
    { length: WORD_SITEMAP_PAGE_COUNT },
    (_, index) => `${baseUrl}/sitemap-words/sitemap/${index + 1}.xml`,
  );

  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
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
      ],
    },
    {
      userAgent: "GPTBot",
      disallow: "/",
    }
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap-static.xml`,
      ...wordSitemaps,
    ],
  };
}
