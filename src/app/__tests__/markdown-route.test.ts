/** @jest-environment node */

import { GET, HEAD } from "@/src/app/~markdown/route";

describe("markdown negotiation route", () => {
  it("returns markdown with token metadata", async () => {
    const response = GET(new Request("https://turkce-sozluk.com/~markdown?path=/tr"));
    const markdown = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Vary")).toBe("Accept");
    expect(Number(response.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
    expect(markdown).toContain("# Turkish Dictionary");
    expect(markdown).toContain("https://turkce-sozluk.com/tr");
    expect(markdown).toContain("https://turkce-sozluk.com/.well-known/api-catalog");
  });

  it("returns markdown headers without a body for HEAD", async () => {
    const response = HEAD(new Request("https://turkce-sozluk.com/~markdown?path=/tr"));
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(Number(response.headers.get("x-markdown-tokens"))).toBeGreaterThan(0);
    expect(body).toBe("");
  });
});
