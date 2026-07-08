import { getBaseUrl } from "@/src/lib/seo-utils";
import { NextResponse } from "next/server";

const LINKSET_PROFILE = "https://www.rfc-editor.org/info/rfc9727";
const CACHE_CONTROL = "public, max-age=3600";

function createApiCatalog() {
  const baseUrl = getBaseUrl();

  return {
    linkset: [
      {
        anchor: `${baseUrl}/.well-known/api-catalog`,
        item: [
          {
            href: `${baseUrl}/api/trpc`,
            type: "application/json",
            title: "tRPC API endpoint",
          },
          {
            href: `${baseUrl}/api/health`,
            type: "application/json",
            title: "Application health endpoint",
          },
        ],
        "service-doc": [
          {
            href: `${baseUrl}/tr`,
            type: "text/html",
            hreflang: "tr",
            title: "Turkish Dictionary public interface",
          },
          {
            href: `${baseUrl}/en`,
            type: "text/html",
            hreflang: "en",
            title: "Turkish Dictionary public interface",
          },
        ],
      },
    ],
  };
}

function createApiCatalogHeaders(): HeadersInit {
  return {
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": `application/linkset+json; profile="${LINKSET_PROFILE}"`,
    Link: '</.well-known/api-catalog>; rel="api-catalog"',
  };
}

export function GET() {
  return new NextResponse(JSON.stringify(createApiCatalog()), {
    headers: createApiCatalogHeaders(),
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: createApiCatalogHeaders(),
  });
}
