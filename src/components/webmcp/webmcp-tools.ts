export type Locale = "en" | "tr";

type ToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
};

export type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input?: Record<string, unknown>) => Promise<ToolResult> | ToolResult;
};

export type WebMcpRuntime = {
  location: Pick<Location, "href" | "origin" | "pathname" | "assign">;
  document: Pick<Document, "title" | "documentElement">;
};

const SUPPORTED_PAGES = ["home", "search", "word-list", "words", "contribute-word", "word-builder", "word-matching", "speed-round"] as const;

function textResult(text: string): ToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

function asLocale(value: unknown, fallback: Locale): Locale {
  return value === "en" || value === "tr" ? value : fallback;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function createSearchPath(query: string, locale: Locale): string {
  const encodedQuery = encodeURIComponent(query.trim());
  return locale === "en" ? `/en/search/${encodedQuery}` : `/tr/arama/${encodedQuery}`;
}

export function createPagePath(page: string, locale: Locale): string | null {
  const pagePaths: Record<(typeof SUPPORTED_PAGES)[number], Record<Locale, string>> = {
    home: { en: "/en", tr: "/tr" },
    search: { en: "/en/search", tr: "/tr/arama" },
    "word-list": { en: "/en/word-list", tr: "/tr/kelime-listesi" },
    words: { en: "/en/words", tr: "/tr/kelimeler" },
    "contribute-word": { en: "/en/contribute-word", tr: "/tr/kelime-katkisi" },
    "word-builder": { en: "/en/word-builder", tr: "/tr/kelime-insa" },
    "word-matching": { en: "/en/word-matching", tr: "/tr/kelime-eslestirme" },
    "speed-round": { en: "/en/speed-round", tr: "/tr/hizli-tur" },
  };

  return page in pagePaths ? pagePaths[page as keyof typeof pagePaths][locale] : null;
}

export function getCurrentLocale(pathname: string, documentLocale: string | undefined): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }

  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    return "tr";
  }

  return documentLocale === "en" ? "en" : "tr";
}

export function createWebMcpTools(runtime: WebMcpRuntime): WebMcpTool[] {
  const getFallbackLocale = () => getCurrentLocale(runtime.location.pathname, runtime.document.documentElement.lang);

  return [
    {
      name: "turkish_dictionary.current_page",
      title: "Get Current Page",
      description: "Return the current Turkish Dictionary page URL, title, locale, and pathname.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      annotations: {
        readOnlyHint: true,
      },
      execute: () => textResult(JSON.stringify({
        title: runtime.document.title,
        url: runtime.location.href,
        pathname: runtime.location.pathname,
        locale: getFallbackLocale(),
      })),
    },
    {
      name: "turkish_dictionary.search",
      title: "Search Turkish Dictionary",
      description: "Navigate to a Turkish Dictionary search result page for a word or phrase.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: {
            type: "string",
            minLength: 1,
            description: "The Turkish word or phrase to search for.",
          },
          locale: {
            type: "string",
            enum: ["tr", "en"],
            description: "Optional locale for the destination page.",
          },
        },
      },
      execute: (input = {}) => {
        const query = asNonEmptyString(input.query);
        if (!query) {
          return textResult("Missing required input: query.");
        }

        const locale = asLocale(input.locale, getFallbackLocale());
        const path = createSearchPath(query, locale);
        const url = new URL(path, runtime.location.origin).toString();
        runtime.location.assign(url);
        return textResult(JSON.stringify({ navigatedTo: url }));
      },
    },
    {
      name: "turkish_dictionary.open_page",
      title: "Open Turkish Dictionary Page",
      description: "Navigate to a key Turkish Dictionary page such as search, word list, contribution, or games.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["page"],
        properties: {
          page: {
            type: "string",
            enum: [...SUPPORTED_PAGES],
            description: "The site page to open.",
          },
          locale: {
            type: "string",
            enum: ["tr", "en"],
            description: "Optional locale for the destination page.",
          },
        },
      },
      execute: (input = {}) => {
        const page = asNonEmptyString(input.page);
        if (!page) {
          return textResult("Missing required input: page.");
        }

        const locale = asLocale(input.locale, getFallbackLocale());
        const path = createPagePath(page, locale);
        if (!path) {
          return textResult(`Unsupported page: ${page}.`);
        }

        const url = new URL(path, runtime.location.origin).toString();
        runtime.location.assign(url);
        return textResult(JSON.stringify({ navigatedTo: url }));
      },
    },
  ];
}
