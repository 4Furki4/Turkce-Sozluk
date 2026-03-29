/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          offset: jest.fn(() => ({
            limit: jest.fn(() => ({
              execute: jest.fn(async () => [
                {
                  name: "boncukluk",
                  updatedAt: "2026-03-29T00:00:00.000Z",
                  createdAt: "2026-03-20T00:00:00.000Z",
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
    id: "id",
  },
}));

import { GET } from "@/src/app/sitemap-words/sitemap/[id]/route";

describe("sitemap-words route", () => {
  it("emits Turkish canonical word URLs only", async () => {
    const response = await GET(new Request("https://turkce-sozluk.com/sitemap-words/sitemap/1.xml"), {
      params: Promise.resolve({ id: "1.xml" }),
    });
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/arama/boncukluk</loc>");
    expect(xml).not.toContain("/en/search/");
    expect(xml).toContain("<lastmod>2026-03-29T00:00:00.000Z</lastmod>");
  });
});
