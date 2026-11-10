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
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/oyunlar</loc>");
    expect(xml).toContain("<loc>https://turkce-sozluk.com/tr/kelime-insa</loc>");
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("/en/");
    expect(xml).not.toContain("saved-words");
    expect(xml).not.toContain("my-requests");
    expect(xml).not.toContain("complete-profile");
    expect(xml).not.toContain("search-history");
    expect(xml).not.toContain("feedback/new");
    expect(xml).not.toContain("~offline");
    expect(xml).not.toContain("/tr/kelime-katkisi");
    expect(xml).not.toContain("/tr/telaffuz-oylama");
    expect(xml).not.toContain("/tr/kelime-kartlari");
    expect(xml).not.toContain("/tr/kelime-eslestirme");
    expect(xml).not.toContain("/tr/hizli-tur");
    expect(xml).not.toContain("/tr/fiil-cekim-olusturucu");
  });
});
