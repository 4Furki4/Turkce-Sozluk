import { MetadataRoute } from "next";
import { getBaseUrl } from '@/src/lib/seo-utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/dashboard/*",
        "/panel/",
        "/panel/*",
        "/complete-profile",
        "/profil-tamamla",
        "/api/",
        "/api/*",
        "/_next/",
        "/_next/*",
      ],
    },
    {
      userAgent: "GPTBot",
      disallow: "/",
    }
    ],
    sitemap: [`${baseUrl}/sitemap-index.xml`],
  };
}
