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

import { GET } from "@/src/app/sitemap.xml/route";

describe("sitemap.xml route", () => {
  it("only points to the static sitemap plus Turkish word sitemap chunks", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/1.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/2.xml</loc>");
    expect(xml).not.toContain("sitemap-index.xml");
  });
});
