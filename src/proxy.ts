import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { getCanonicalPathname, normalizePathname } from "./lib/seo-utils";

const handleI18nRouting = createMiddleware(routing);

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

export default function proxy(request: NextRequest) {
  const normalizedPathname = normalizePathname(request.nextUrl.pathname);
  const canonicalPathname = getCanonicalPathname(normalizedPathname);

  if (canonicalPathname !== normalizedPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPathname;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-current-path", canonicalPathname);

  const response = handleI18nRouting(cloneRequestWithHeaders(request, requestHeaders));

  if (isEnglishPath(canonicalPathname)) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/([\\w-]+)?/search/(.+)",
    "/([\\w-]+)?/arama/(.+)",
  ],
};
