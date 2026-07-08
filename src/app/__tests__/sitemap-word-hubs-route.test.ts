/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

import { GET } from "@/src/app/sitemap-word-hubs.xml/route";

describe("sitemap-word-hubs.xml route", () => {
  it("emits Turkish crawl hub URLs only", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/kelimeler</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/kelimeler/a</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/kelimeler/%C3%A7</loc>");
    expect(xml).not.toContain("/en/words");
  });
});
