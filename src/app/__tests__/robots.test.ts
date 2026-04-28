/** @jest-environment node */

import robots from "@/src/app/robots";

describe("robots.txt metadata", () => {
  it("lists the main sitemap plus directly crawlable sitemap files", () => {
    const result = robots();

    expect(result.sitemap).toContain("https://turkce-sozluk.com/sitemap.xml");
    expect(result.sitemap).toContain("https://turkce-sozluk.com/sitemap-static.xml");
    expect(result.sitemap).toContain("https://turkce-sozluk.com/sitemap-words/sitemap/1.xml");
    expect(result.sitemap).toContain("https://turkce-sozluk.com/sitemap-words/sitemap/20.xml");
    expect(result.sitemap).toHaveLength(22);
  });
});
