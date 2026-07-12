/** @jest-environment node */

import { GET } from "@/src/app/robots.txt/route";
import { createRobotsTxt } from "@/src/app/robots.txt/robots-content";

describe("robots.txt route", () => {
  it("lists the main sitemap plus directly crawlable sitemap files", () => {
    const robotsTxt = createRobotsTxt();
    const sitemaps = robotsTxt
      .split("\n")
      .filter((line) => line.startsWith("Sitemap: "))
      .map((line) => line.slice("Sitemap: ".length));

    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap.xml");
    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap-static.xml");
    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap-word-hubs.xml");
    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap-priority-words.xml");
    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap-words/sitemap/1.xml");
    expect(sitemaps).toContain("https://turkce-sozluk.com/sitemap-words/sitemap/20.xml");
    expect(sitemaps).toHaveLength(24);
  });

  it("declares content usage preferences for agents", () => {
    expect(createRobotsTxt()).toContain("Content-Signal: ai-train=no, search=yes, ai-input=no");
  });

  it("serves robots.txt as plain text", async () => {
    const response = GET();
    const robotsTxt = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(robotsTxt).toContain("User-Agent: *");
    expect(robotsTxt).toContain("User-Agent: GPTBot");
  });
});
