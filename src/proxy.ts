import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { getCanonicalPathname, normalizePathname } from "./lib/seo-utils";

const handleI18nRouting = createMiddleware(routing);

const AGENT_DISCOVERY_LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog"';
const MARKDOWN_RENDER_PATH = "/~markdown";
const MALFORMED_PATH_FALLBACK = "~not-found";
const PLAY_PATH_PREFIX = "/play";
const DEFAULT_PLAY_HOSTS = new Set([
  "oyna.localhost",
  "oyna.turkce-sozluk.com",
]);
const PLAY_CANONICAL_PATHS = new Set([
  "/tr",
  "/en",
  "/tr/kelime-kartlari",
  "/en/flashcard-game",
]);

function getConfiguredPlayHost(): string | null {
  const playOrigin = process.env.NEXT_PUBLIC_PLAY_ORIGIN;

  if (!playOrigin) {
    return null;
  }

  try {
    return new URL(playOrigin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getRequestHostname(request: NextRequest): string {
  const host = request.headers.get("host");

  if (host) {
    try {
      return new URL(`http://${host}`).hostname.toLowerCase();
    } catch {
      // Fall back to Next's parsed URL for malformed Host headers.
    }
  }

  return request.nextUrl.hostname.toLowerCase();
}

function isPlayHost(request: NextRequest): boolean {
  const hostname = getRequestHostname(request);
  const configuredPlayHost = getConfiguredPlayHost();

  return DEFAULT_PLAY_HOSTS.has(hostname) || hostname === configuredPlayHost;
}

function isPlayPath(pathname: string): boolean {
  return PLAY_CANONICAL_PATHS.has(pathname);
}

function hasMalformedPathEncoding(pathname: string): boolean {
  try {
    decodeURI(pathname);
    return false;
  } catch {
    return true;
  }
}

function getLocaleFromPath(pathname: string): "en" | "tr" {
  const locale = pathname.split("/")[1];
  return locale === "en" ? "en" : "tr";
}

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

function acceptsMarkdown(request: NextRequest): boolean {
  const accept = request.headers.get("accept");
  return accept?.split(",").some((value) => {
    const [mediaType, ...params] = value.trim().toLowerCase().split(";");
    const q = params
      .map((param) => param.trim())
      .find((param) => param.startsWith("q="))
      ?.slice(2);

    return mediaType === "text/markdown" && q !== "0";
  }) ?? false;
}

function shouldRenderMarkdown(request: NextRequest, pathname: string): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (normalizePathname(pathname) === MARKDOWN_RENDER_PATH) {
    return false;
  }

  return acceptsMarkdown(request);
}

function rewriteToMarkdownRenderer(request: NextRequest, canonicalPathname: string): NextResponse {
  const markdownUrl = request.nextUrl.clone();
  markdownUrl.pathname = MARKDOWN_RENDER_PATH;
  markdownUrl.search = "";
  markdownUrl.searchParams.set("path", canonicalPathname);
  return NextResponse.rewrite(markdownUrl);
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (hasMalformedPathEncoding(pathname)) {
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = `/${getLocaleFromPath(pathname)}/${MALFORMED_PATH_FALLBACK}`;
    fallbackUrl.search = "";
    return NextResponse.redirect(fallbackUrl, 307);
  }

  const normalizedPathname = normalizePathname(pathname);
  const canonicalPathname = getCanonicalPathname(normalizedPathname);

  if (shouldRenderMarkdown(request, normalizedPathname)) {
    return rewriteToMarkdownRenderer(request, canonicalPathname);
  }

  if (canonicalPathname !== normalizedPathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPathname;
    const response = NextResponse.redirect(redirectUrl, 308);
    addAgentDiscoveryHeaders(response, canonicalPathname);
    return response;
  }

  if (isPlayHost(request) && isPlayPath(canonicalPathname)) {
    const playUrl = request.nextUrl.clone();
    playUrl.pathname = `${PLAY_PATH_PREFIX}${canonicalPathname}`;
    playUrl.search = "";

    return NextResponse.rewrite(playUrl);
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
