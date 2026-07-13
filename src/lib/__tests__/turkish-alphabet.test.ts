import { normalizeTurkishLetter } from "@/src/lib/turkish-alphabet";

describe("normalizeTurkishLetter", () => {
  it("returns null for malformed encoded input", () => {
    expect(normalizeTurkishLetter("%E0%A4%A")).toBeNull();
  });
});
  