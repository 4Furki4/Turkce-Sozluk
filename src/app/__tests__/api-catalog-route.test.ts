/** @jest-environment node */

import { GET, HEAD } from "@/src/app/.well-known/api-catalog/route";

describe("/.well-known/api-catalog route", () => {
  it("returns a linkset catalog for agent API discovery", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.headers.get("Content-Type")).toContain("application/linkset+json");
    expect(response.headers.get("Link")).toBe('</.well-known/api-catalog>; rel="api-catalog"');
    expect(body.linkset[0].anchor).toContain("/.well-known/api-catalog");
    expect(body.linkset[0].item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: expect.stringContaining("/api/trpc") }),
        expect.objectContaining({ href: expect.stringContaining("/api/health") }),
      ]),
    );
    expect(body.linkset[0]["service-doc"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: expect.stringContaining("/tr") }),
        expect.objectContaining({ href: expect.stringContaining("/en") }),
      ]),
    );
  });

  it("returns the same discovery headers for HEAD requests", () => {
    const response = HEAD();

    expect(response.headers.get("Content-Type")).toContain("application/linkset+json");
    expect(response.headers.get("Link")).toBe('</.well-known/api-catalog>; rel="api-catalog"');
  });
});
