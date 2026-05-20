/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const executeWordCountMock = jest.fn(async () => [{ count: 10001 }]);

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        execute: executeWordCountMock,
      })),
    })),
  },
}));

import { GET } from "@/src/app/sitemap.xml/route";

describe("sitemap.xml route", () => {
  beforeEach(() => {
    executeWordCountMock.mockResolvedValue([{ count: 10001 }]);
  });

  it("only points to the static sitemap plus Turkish word sitemap chunks", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/1.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/2.xml</loc>");
    expect(xml).not.toContain("sitemap-index.xml");
  });

  it("falls back to the static sitemap when the word count query fails", async () => {
    executeWordCountMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).not.toContain("/sitemap-words/sitemap/");
  });
});
