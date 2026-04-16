/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

import {
  escapeXml,
  getCanonicalPathname,
  getStaticRouteCanonicalPath,
  getWordCanonicalPath,
  interpolatePathTemplate,
  matchPathTemplate,
} from "@/src/lib/seo-utils";

describe("seo-utils", () => {
  it("normalizes legacy public paths to canonical Turkish paths", () => {
    expect(getCanonicalPathname("/")).toBe("/tr");
    expect(getCanonicalPathname("/search/boncukluk")).toBe("/tr/arama/boncukluk");
    expect(getCanonicalPathname("/arama/boncukluk")).toBe("/tr/arama/boncukluk");
    expect(getCanonicalPathname("/tr/search/boncukluk")).toBe("/tr/arama/boncukluk");
    expect(getCanonicalPathname("/word-list")).toBe("/tr/kelime-listesi");
  });

  it("keeps English prefixed pages on English display URLs", () => {
    expect(getCanonicalPathname("/en/word-list")).toBe("/en/word-list");
    expect(getCanonicalPathname("/en/arama/boncukluk")).toBe("/en/search/boncukluk");
    expect(getWordCanonicalPath("boncukluk", "en")).toBe("/en/search/boncukluk");
  });

  it("builds Turkish canonical paths for static and word pages", () => {
    expect(getStaticRouteCanonicalPath("/", "tr")).toBe("/tr");
    expect(getStaticRouteCanonicalPath("/word-list", "tr")).toBe("/tr/kelime-listesi");
    expect(getStaticRouteCanonicalPath("/dashboard/announcements", "tr")).toBe("/tr/panel/duyurular");
    expect(getWordCanonicalPath("boncukluk", "tr")).toBe("/tr/arama/boncukluk");
  });

  it("redirects the mistaken Turkish dashboard aliases added by the SEO routing refactor", () => {
    expect(getCanonicalPathname("/dashboard/duyurular")).toBe("/tr/panel/duyurular");
    expect(getCanonicalPathname("/tr/dashboard/duyurular")).toBe("/tr/panel/duyurular");
    expect(getCanonicalPathname("/tr/dashboard/gundelik-kelimeler/42/duzenle")).toBe(
      "/tr/panel/gundelik-kelimeler/42/duzenle",
    );
  });

  it("matches and interpolates route templates", () => {
    expect(matchPathTemplate("/arama/[word]", "/arama/boncukluk")).toEqual({ word: "boncukluk" });
    expect(interpolatePathTemplate("/tr/arama/[word]", { word: "boncukluk" })).toBe("/tr/arama/boncukluk");
  });

  it("escapes XML content safely", () => {
    expect(escapeXml(`"a" & 'b' <c>`)).toBe("&quot;a&quot; &amp; &apos;b&apos; &lt;c&gt;");
  });
});
