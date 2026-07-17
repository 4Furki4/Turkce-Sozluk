import {
    getPlayFlashcardPath,
    getPlayHomePath,
    getSafeAuthReturnUrl,
} from "../play-url";

describe("Play URL helpers", () => {
    it("returns localized same-origin Play paths", () => {
        expect(getPlayHomePath("tr")).toBe("/tr/oyna");
        expect(getPlayHomePath("en")).toBe("/en/play");
        expect(getPlayFlashcardPath("tr")).toBe("/tr/oyna/kelime-kartlari");
        expect(getPlayFlashcardPath("en")).toBe("/en/play/flashcards");
    });

    it("allows auth returns only to the current origin", () => {
        expect(
            getSafeAuthReturnUrl(
                "/tr/oyna/kelime-kartlari?source=signin#review",
                "http://localhost:3000",
            ),
        ).toBe("/tr/oyna/kelime-kartlari?source=signin#review");
        expect(
            getSafeAuthReturnUrl(
                "https://development.turkce-sozluk.com/tr/oyna",
                "https://development.turkce-sozluk.com",
            ),
        ).toBe("/tr/oyna");
        expect(getSafeAuthReturnUrl("http://oyna.localhost:3000/tr/oyna", "http://localhost:3000")).toBeNull();
        expect(getSafeAuthReturnUrl("https://example.com", "http://localhost:3000")).toBeNull();
    });
});
