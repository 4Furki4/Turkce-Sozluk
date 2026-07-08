/** @jest-environment node */

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(),
  setRequestLocale: jest.fn(),
}));

jest.mock("@/src/i18n/routing", () => require("@/src/test-support/mock-routing"));

jest.mock("@/src/lib/seo-word-index", () => ({
  getPopularWordsByLetter: jest.fn(),
  getWordsByLetter: jest.fn(),
  normalizeTurkishLetter: (value: string) => {
    const letters = ["a", "b", "c", "ç"];
    const normalized = decodeURIComponent(value).trim().toLocaleLowerCase("tr-TR");
    return letters.includes(normalized) ? normalized : null;
  },
  TURKISH_ALPHABET: ["a", "b", "c", "ç"],
}));

import { getValidLetterOrNotFound } from "@/src/app/[locale]/words/[letter]/letter-utils";
import { notFound } from "next/navigation";

const mockedNotFound = jest.mocked(notFound);

describe("words letter page", () => {
  beforeEach(() => {
    mockedNotFound.mockClear();
  });

  it("accepts valid Turkish letters", () => {
    expect(getValidLetterOrNotFound("%C3%A7")).toBe("ç");
    expect(mockedNotFound).not.toHaveBeenCalled();
  });

  it("rejects invalid letter segments", () => {
    expect(() => getValidLetterOrNotFound("x")).toThrow("NEXT_NOT_FOUND");
    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });
});
