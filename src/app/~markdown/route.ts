import { getBaseUrl, normalizePathname } from "@/src/lib/seo-utils";
import { NextResponse } from "next/server";

type MarkdownPage = {
  title: string;
  description: string;
  links: Array<{
    label: string;
    path: string;
  }>;
};

const CACHE_CONTROL = "public, max-age=300";

const PAGE_DETAILS: Record<string, MarkdownPage> = {
  "/": {
    title: "Turkish Dictionary",
    description: "A modern, community-driven Turkish dictionary with word search, word lists, games, and contribution workflows.",
    links: [
      { label: "Turkish homepage", path: "/tr" },
      { label: "English homepage", path: "/en" },
      { label: "API catalog", path: "/.well-known/api-catalog" },
    ],
  },
  "/tr": {
    title: "Turkish Dictionary",
    description: "Turkish homepage for searching Turkish words, browsing dictionary content, and using learning tools.",
    links: [
      { label: "Search", path: "/tr/arama" },
      { label: "Word list", path: "/tr/kelime-listesi" },
      { label: "Words", path: "/tr/kelimeler" },
      { label: "API catalog", path: "/.well-known/api-catalog" },
    ],
  },
  "/en": {
    title: "Turkish Dictionary",
    description: "English homepage for searching Turkish words, browsing dictionary content, and using learning tools.",
    links: [
      { label: "Search", path: "/en/search" },
      { label: "Word list", path: "/en/word-list" },
      { label: "Words", path: "/en/words" },
      { label: "API catalog", path: "/.well-known/api-catalog" },
    ],
  },
};

function getMarkdownPage(pathname: string): MarkdownPage {
  const normalizedPathname = normalizePathname(pathname);
  const knownPage = PAGE_DETAILS[normalizedPathname];

  if (knownPage) {
    return knownPage;
  }

  return {
    title: "Turkish Dictionary",
    description: `Markdown representation for ${normalizedPathname}.`,
    links: [
      { label: "Turkish homepage", path: "/tr" },
      { label: "English homepage", path: "/en" },
      { label: "API catalog", path: "/.well-known/api-catalog" },
    ],
  };
}

function estimateTokenCount(markdown: string): number {
  return Math.max(1, Math.ceil(markdown.length / 4));
}

function createMarkdown(pathname: string): string {
  const baseUrl = getBaseUrl();
  const normalizedPathname = normalizePathname(pathname);
  const page = getMarkdownPage(normalizedPathname);
  const canonicalPath = normalizedPathname === "/" ? "/tr" : normalizedPathname;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const links = page.links
    .map((link) => `- [${link.label}](${baseUrl}${normalizePathname(link.path)})`)
    .join("\n");

  return [
    "---",
    `title: ${page.title}`,
    `url: ${canonicalUrl}`,
    "---",
    "",
    `# ${page.title}`,
    "",
    page.description,
    "",
    "## Links",
    "",
    links,
    "",
  ].join("\n");
}

function createMarkdownResponse(markdown: string, init?: ResponseInit): NextResponse {
  return new NextResponse(markdown, {
    ...init,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "x-markdown-tokens": String(estimateTokenCount(markdown)),
      ...init?.headers,
    },
  });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const markdown = createMarkdown(url.searchParams.get("path") ?? "/");
  return createMarkdownResponse(markdown);
}

export function HEAD(request: Request) {
  const url = new URL(request.url);
  const markdown = createMarkdown(url.searchParams.get("path") ?? "/");
  return createMarkdownResponse("", {
    headers: {
      "x-markdown-tokens": String(estimateTokenCount(markdown)),
    },
  });
}
