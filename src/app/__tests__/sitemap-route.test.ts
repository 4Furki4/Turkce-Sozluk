/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        groupBy: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              execute: jest.fn(async () => [
                {
                  name: "boncukluk",
                  lastModified: "2026-03-29T00:00:00.000Z",
                },
              ]),
            })),
          })),
        })),
      })),
    })),
  },
}));

jest.mock("@/db/schema/words", () => ({
  words: {
    name: "name",
    updated_at: "updated_at",
    created_at: "created_at",
  },
}));

import { GET } from "@/src/app/sitemap.xml/route";

describe("sitemap.xml route", () => {
  it("emits directly discoverable Turkish static and word URLs", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/arama/boncukluk</loc>");
    expect(xml).not.toContain("<sitemapindex");
    expect(xml).not.toContain("/sitemap-words/sitemap/");
  });
});
