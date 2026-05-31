/** @jest-environment node */

import {
    extractSearchWordFromPathname,
    getDynamicWordHref,
    getOfflineSearchHref,
    getPlainSearchAction,
    getSearchQueryHref,
    getWordSearchHref,
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

    it("builds canonical query search URLs", () => {
        expect(getSearchQueryHref("tr", "kıyım")).toBe(
            "/tr/arama?word=k%C4%B1y%C4%B1m",
        );
        expect(getSearchQueryHref("en", "güzel sanatlar")).toBe(
            "/en/search?word=g%C3%BCzel+sanatlar",
        );
    });

    it("keeps the legacy offline URL helper on the dynamic word route", () => {
        expect(getOfflineSearchHref("tr", "kıyım")).toBe(
            "/tr/arama/k%C4%B1y%C4%B1m",
        );
        expect(getOfflineSearchHref("en", "güzel sanatlar")).toBe(
            "/en/search/g%C3%BCzel%20sanatlar",
        );
    });

    it("builds localized dynamic word URLs for the PWA search shell", () => {
        expect(getDynamicWordHref("tr", " susuz ")).toBe("/tr/arama/susuz");
        expect(getWordSearchHref("en", "güzel sanatlar")).toBe(
            "/en/search/g%C3%BCzel%20sanatlar",
        );
    });

    it("extracts words from dynamic search paths used by cached PWA shells", () => {
        expect(extractSearchWordFromPathname("/tr/arama/susuz")).toBe("susuz");
        expect(extractSearchWordFromPathname("/en/search/g%C3%BCzel%20sanatlar")).toBe(
            "güzel sanatlar",
        );
    });
});
