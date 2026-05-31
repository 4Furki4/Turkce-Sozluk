/** @jest-environment node */

import { readFileSync } from "fs";
import { join } from "path";

describe("service worker navigation fallbacks", () => {
  const source = readFileSync(join(process.cwd(), "src/app/sw.ts"), "utf8");

  it("treats home, base search, dynamic search, and offline dictionary as app shells", () => {
    expect(source).toContain("isHomeShellPath(pathname)");
    expect(source).toContain("isBaseSearchPath(pathname)");
    expect(source).toContain("isDynamicSearchPath(pathname)");
    expect(source).toContain("OFFLINE_DICTIONARY_PREFIXES");
  });

  it("serves dynamic search URLs from the base search shell cache", () => {
    expect(source).toContain("skipRequestMatch");
    expect(source).toContain("return \"/tr/arama\"");
    expect(source).toContain("return \"/en/search\"");
  });

  it("does not serve cached base search shell before SSR can redirect query searches", () => {
    expect(source).toContain("isSearchQueryNavigation");
    expect(source).toContain('url.searchParams.has("word")');
    expect(source).toContain("getSearchQueryRedirectUrl");
    expect(source).toContain("Response.redirect(searchQueryRedirectUrl, 307)");
    expect(source).toContain("!isSearchQueryNavigation(url)");
  });

  it("keeps dynamic word pages network-first while online for no-JS SSR refreshes", () => {
    expect(source).toContain("shouldServeShellFirst");
    expect(source).toContain("!self.navigator.onLine || !isDynamicSearchPath(url.pathname)");
  });
});
