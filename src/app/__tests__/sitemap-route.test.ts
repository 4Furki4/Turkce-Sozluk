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

  it("orders static, discovery, priority, then archive sitemaps", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-word-hubs.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-priority-words.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/1.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-words/sitemap/2.xml</loc>");
    expect(xml).not.toContain("sitemap-index.xml");
    expect(xml.indexOf("sitemap-static.xml")).toBeLessThan(xml.indexOf("sitemap-word-hubs.xml"));
    expect(xml.indexOf("sitemap-word-hubs.xml")).toBeLessThan(xml.indexOf("sitemap-priority-words.xml"));
    expect(xml.indexOf("sitemap-priority-words.xml")).toBeLessThan(xml.indexOf("sitemap-words/sitemap/1.xml"));
  });

  it("keeps discovery sitemaps when the archive count query fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    executeWordCountMock.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-static.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-word-hubs.xml</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/sitemap-priority-words.xml</loc>");
    expect(xml).not.toContain("/sitemap-words/sitemap/");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to generate word sitemap index entries",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
