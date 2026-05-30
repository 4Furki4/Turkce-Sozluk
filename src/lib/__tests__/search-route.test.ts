/** @jest-environment node */

import {
    getOfflineSearchHref,
    getPlainSearchAction,
    normalizeSearchWord,
} from "@/src/lib/search-route";

describe("search-route progressive enhancement helpers", () => {
    it("builds localized plain search form actions", () => {
        expect(getPlainSearchAction("en")).toBe("/en/search");
        expect(getPlainSearchAction("tr")).toBe("/tr/arama");
        expect(getPlainSearchAction("unknown")).toBe("/tr/arama");
    });

    it("normalizes plain search form values", () => {
        expect(normalizeSearchWord("  güzel   sanatlar  ")).toBe("güzel sanatlar");
        expect(normalizeSearchWord(["  kalem  "])).toBe("kalem");
        expect(normalizeSearchWord(undefined)).toBe("");
    });

    it("builds client-only offline search URLs", () => {
        expect(getOfflineSearchHref("tr", "kıyım")).toBe(
            "/tr/arama?offlineWord=k%C4%B1y%C4%B1m",
        );
        expect(getOfflineSearchHref("en", "güzel sanatlar")).toBe(
            "/en/search?offlineWord=g%C3%BCzel+sanatlar",
        );
    });
});
