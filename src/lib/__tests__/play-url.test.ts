import {
    getDictionaryOrigin,
    getPlayOrigin,
    getPlayUrl,
    getSafeAuthReturnUrl,
} from "../play-url";

describe("Play URL helpers", () => {
    it("keeps local Play navigation on the matching localhost port", () => {
        expect(getPlayOrigin("http://localhost:3000")).toBe("http://oyna.localhost:3000");
        expect(getPlayUrl("http://localhost:3000", "tr")).toBe(
            "http://oyna.localhost:3000/tr/kelime-kartlari",
        );
        expect(getDictionaryOrigin("http://oyna.localhost:3000")).toBe("http://localhost:3000");
    });

    it("derives the production dictionary host from the Play host", () => {
        expect(getDictionaryOrigin("https://oyna.turkce-sozluk.com")).toBe(
            "https://turkce-sozluk.com",
        );
    });

    it("allows auth returns only to the dictionary or its Play host", () => {
        expect(
            getSafeAuthReturnUrl(
                "http://oyna.localhost:3000/tr/kelime-kartlari",
                "http://localhost:3000",
            ),
        ).toBe("http://oyna.localhost:3000/tr/kelime-kartlari");
        expect(getSafeAuthReturnUrl("https://example.com", "http://localhost:3000")).toBeNull();
    });
});
