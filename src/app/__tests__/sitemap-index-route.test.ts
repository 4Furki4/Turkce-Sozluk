/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        execute: jest.fn(async () => [{ count: 10001 }]),
      })),
    })),
  },
}));

jest.mock("@/db/schema/words", () => ({
  words: {
    name: "name",
  },
}));

import { GET } from "@/src/app/sitemap-index.xml/route";

describe("sitemap-index.xml route", () => {
  it("points to the static sitemap plus Turkish word sitemap chunks", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/1.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/2.xml</loc>");
  });
});
