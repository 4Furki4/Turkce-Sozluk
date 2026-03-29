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
});
