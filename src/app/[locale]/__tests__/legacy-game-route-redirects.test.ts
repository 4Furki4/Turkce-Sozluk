/** @jest-environment node */

jest.mock("@/src/i18n/routing", () => ({
    redirect: jest.fn(),
}));

import SpeedRoundPage from "@/src/app/[locale]/speed-round/page";
import WordMatchingGamePage from "@/src/app/[locale]/word-matching/page";
import { redirect } from "@/src/i18n/routing";

const mockedRedirect = jest.mocked(redirect);

describe("legacy game routes", () => {
    beforeEach(() => {
        mockedRedirect.mockClear();
    });

    it.each([
        ["Speed Round", SpeedRoundPage, "/play/speed-round"],
        ["Word Matching", WordMatchingGamePage, "/play/word-matching"],
    ])("redirects legacy %s routes to Play in Turkish", async (_name, Page, href) => {
        await Page({ params: Promise.resolve({ locale: "tr" }) });

        expect(mockedRedirect).toHaveBeenCalledWith({ href, locale: "tr" });
    });

    it.each([
        ["Speed Round", SpeedRoundPage, "/play/speed-round"],
        ["Word Matching", WordMatchingGamePage, "/play/word-matching"],
    ])("redirects legacy %s routes to Play in English", async (_name, Page, href) => {
        await Page({ params: Promise.resolve({ locale: "en" }) });

        expect(mockedRedirect).toHaveBeenCalledWith({ href, locale: "en" });
    });
});
