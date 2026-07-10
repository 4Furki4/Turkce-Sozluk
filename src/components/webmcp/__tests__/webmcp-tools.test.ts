import { createPagePath, createSearchPath, createWebMcpTools, getCurrentLocale } from "../webmcp-tools";

describe("WebMCP tools", () => {
  const assignedUrls: string[] = [];
  const runtime = {
    location: {
      href: "https://turkce-sozluk.com/tr",
      origin: "https://turkce-sozluk.com",
      pathname: "/tr",
      assign: (url: string) => {
        assignedUrls.push(url);
      },
    },
    document: {
      title: "Turkish Dictionary",
      documentElement: { lang: "tr" },
    },
  };

  beforeEach(() => {
    assignedUrls.length = 0;
  });

  it("builds localized search paths", () => {
    expect(createSearchPath("çay", "tr")).toBe("/tr/arama/%C3%A7ay");
    expect(createSearchPath("çay", "en")).toBe("/en/search/%C3%A7ay");
  });

  it("builds localized page paths", () => {
    expect(createPagePath("word-list", "tr")).toBe("/tr/kelime-listesi");
    expect(createPagePath("word-list", "en")).toBe("/en/word-list");
    expect(createPagePath("unknown", "tr")).toBeNull();
  });

  it("detects current locale from path before document lang", () => {
    expect(getCurrentLocale("/en/search", "tr")).toBe("en");
    expect(getCurrentLocale("/tr/arama", "en")).toBe("tr");
    expect(getCurrentLocale("/", "en")).toBe("en");
  });

  it("creates valid tool definitions and navigates for search", async () => {
    const tools = createWebMcpTools(runtime);
    const searchTool = tools.find((tool) => tool.name === "turkish_dictionary.search");

    expect(tools).toHaveLength(3);
    expect(searchTool?.description).toContain("Navigate");
    expect(searchTool?.inputSchema).toEqual(expect.objectContaining({ type: "object" }));

    await searchTool?.execute({ query: "kitap", locale: "en" });
    expect(assignedUrls).toEqual(["https://turkce-sozluk.com/en/search/kitap"]);
  });

  it("returns current page data as a read-only tool", async () => {
    const tools = createWebMcpTools(runtime);
    const currentPageTool = tools.find((tool) => tool.name === "turkish_dictionary.current_page");
    const result = await currentPageTool?.execute();

    expect(currentPageTool?.annotations?.readOnlyHint).toBe(true);
    expect(result?.content[0].text).toContain("\"pathname\":\"/tr\"");
  });
});
