/** @jest-environment node */

import { GET } from "@/src/app/sitemap-index.xml/route";

describe("legacy sitemap-index route", () => {
  it("permanently redirects to /sitemap.xml on the public request origin", () => {
    const response = GET();

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("/sitemap.xml");
  });
});
