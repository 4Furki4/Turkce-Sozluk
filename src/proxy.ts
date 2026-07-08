import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { getCanonicalPathname, normalizePathname } from "./lib/seo-utils";

const handleI18nRouting = createMiddleware(routing);

const AGENT_DISCOVERY_LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog"';

function cloneRequestWithHeaders(request: NextRequest, headers: Headers): NextRequest {
  return new NextRequest(request.url, {
    headers,
    method: request.method,
  });
}

function isEnglishPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === "/en" || normalized.startsWith("/en/");
}

function isHomepagePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === "/tr" || normalized === "/en";
}

function addAgentDiscoveryHeaders(response: NextResponse, pathname: string): void {
  if (isHomepagePath(pathname)) {
    response.headers.append("Link", AGENT_DISCOVERY_LINK_HEADER);
  }
}

export default function proxy(request: NextRequest) {
  const normalizedPathname = normalizePathname(request.nextUrl.pathname);
  const canonicalPathname = getCanonicalPathname(normalizedPathname);

  if (canonicalPathname !== normalizedPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPathname;
    const response = NextResponse.redirect(redirectUrl, 308);
    addAgentDiscoveryHeaders(response, canonicalPathname);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", canonicalPathname);

  const response = handleI18nRouting(cloneRequestWithHeaders(request, requestHeaders));

  if (isEnglishPath(canonicalPathname)) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  addAgentDiscoveryHeaders(response, canonicalPathname);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/([\\w-]+)?/search/(.+)",
    "/([\\w-]+)?/arama/(.+)",
  ],
};
