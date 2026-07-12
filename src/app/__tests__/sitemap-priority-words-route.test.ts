/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("@/src/lib/seo-word-index", () => ({
  getPriorityWords: jest.fn(async () => [
    {
      id: 1,
      name: "çökük",
      firstMeaning: "Çökmüş",
      lastModified: "2026-07-01T00:00:00.000Z",
      viewCount: 10,
      meaningCount: 1,
      exampleCount: 1,
      relatedWordCount: 0,
      relatedPhraseCount: 0,
    },
    {
      id: 2,
      name: `"a" & 'b'`,
      firstMeaning: "Escaped word",
      lastModified: "2026-07-02T00:00:00.000Z",
      viewCount: 5,
      meaningCount: 1,
      exampleCount: 0,
      relatedWordCount: 0,
      relatedPhraseCount: 0,
    },
  ]),
  getSeoWordLastModified: (word: { lastModified: string }) => word.lastModified,
  PRIORITY_WORD_LIMIT: 5000,
}));

import { GET } from "@/src/app/sitemap-priority-words.xml/route";

describe("sitemap-priority-words.xml route", () => {
  it("emits escaped Turkish canonical priority word URLs", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/arama/%C3%A7%C3%B6k%C3%BCk</loc>");
    expect(xml).toContain("<lastmod>2026-07-01T00:00:00.000Z</lastmod>");
    expect(xml).toContain(
      "<loc>https://turkce-sozluk.com/tr/arama/%22a%22%20%26%20&apos;b&apos;</loc>",
    );
    expect(xml).not.toContain("/en/search/");
  });
});
