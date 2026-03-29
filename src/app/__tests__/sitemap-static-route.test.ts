/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

import { GET } from "@/src/app/sitemap-static.xml/route";

describe("sitemap-static.xml route", () => {
  it("only includes Turkish indexable public URLs", async () => {
    const response = await GET();
    const xml = await response.text();

    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/kelime-listesi</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/arama</loc>");
    expect(xml).not.toContain("/en/");
    expect(xml).not.toContain("saved-words");
    expect(xml).not.toContain("my-requests");
    expect(xml).not.toContain("complete-profile");
    expect(xml).not.toContain("search-history");
    expect(xml).not.toContain("feedback/new");
    expect(xml).not.toContain("~offline");
  });
});
