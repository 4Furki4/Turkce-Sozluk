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
});
