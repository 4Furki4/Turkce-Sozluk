/** @jest-environment node */

import { NextRequest, NextResponse } from "next/server";

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("next-intl/middleware", () => ({
  __esModule: true,
  default: () => () => NextResponse.next(),
}));

import proxy from "@/src/proxy";

describe("proxy SEO normalization", () => {
  it("permanently redirects the root path to /tr", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://turkce-sozluk.com/tr");
    expect(response.headers.get("Link")).toBe('</.well-known/api-catalog>; rel="api-catalog"');
  });

  it("permanently redirects legacy search URLs to Turkish canonicals", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/search/boncukluk"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://turkce-sozluk.com/tr/arama/boncukluk");
  });

  it("normalizes mixed-locale search URLs", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/en/arama/boncukluk"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://turkce-sozluk.com/en/search/boncukluk");
  });

  it("adds noindex headers to English pages", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/en/word-list"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, follow");
  });

  it("adds agent discovery link headers to localized homepage responses", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/tr"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Link")).toBe('</.well-known/api-catalog>; rel="api-catalog"');
  });

  it("does not add agent discovery link headers to non-homepage responses", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/tr/arama"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Link")).toBeNull();
  });

  it("redirects malformed localized paths to the localized not-found route", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/tr/kelimeler/%E0%A4%A"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://turkce-sozluk.com/tr/~not-found");
  });

  it("rewrites markdown requests to the markdown renderer", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/tr", {
      headers: {
        accept: "text/markdown",
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://turkce-sozluk.com/~markdown?path=%2Ftr");
  });

  it("rewrites the Play subdomain's Turkish flashcards route to its dedicated shell", () => {
    const response = proxy(new NextRequest("http://oyna.localhost:3000/tr/kelime-kartlari"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://oyna.localhost:3000/play/tr/kelime-kartlari",
    );
  });

  it("uses the Host header when a local server normalizes the request URL hostname", () => {
    const response = proxy(new NextRequest("http://localhost:3000/tr/kelime-kartlari", {
      headers: {
        host: "oyna.localhost:3000",
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3000/play/tr/kelime-kartlari",
    );
  });

  it("keeps the dictionary host on its normal flashcards route", () => {
    const response = proxy(new NextRequest("http://localhost:3000/tr/kelime-kartlari"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("does not rewrite markdown requests when the client explicitly rejects markdown", () => {
    const response = proxy(new NextRequest("https://turkce-sozluk.com/tr", {
      headers: {
        accept: "text/markdown;q=0, text/html",
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
