/** @jest-environment node */

import { GET } from "@/src/app/sitemap-index.xml/route";

describe("legacy sitemap-index route", () => {
  it("permanently redirects to /sitemap.xml", async () => {
    const response = await GET(new Request("https://turkce-sozluk.com/sitemap-index.xml"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://turkce-sozluk.com/sitemap.xml");
  });
});
