import {
  classifyWordIndexability,
  getPointerTargetNames,
  getSubstantiveMeanings,
  isSubstantiveMeaning,
} from "@/src/lib/word-indexability";

describe("word indexability", () => {
  it("recognizes substantive definitions", () => {
    expect(isSubstantiveMeaning("Bir kelimenin gerçek tanımı")).toBe(true);
    expect(isSubstantiveMeaning("   ")).toBe(false);
    expect(isSubstantiveMeaning("Bakınız: başka kelime")).toBe(false);
  });

  it("keeps mixed entries indexable and filters navigation-only meanings", () => {
    const meanings = [
      { meaning: "Bakınız: yoğun" },
      { meaning: "Az yer kaplayan, sıkı ve derli toplu" },
    ];

    expect(classifyWordIndexability({ meanings })).toBe("indexable");
    expect(getSubstantiveMeanings(meanings)).toEqual([meanings[1]]);
  });

  it("classifies navigation-only entries as pointers", () => {
    expect(
      classifyWordIndexability({
        meanings: [{ meaning: "Bakınız: ağabey" }],
        relatedWords: [{ related_word_name: "ağabey" }],
      }),
    ).toBe("pointer");
  });

  it("classifies entries without definitions or useful relations as empty", () => {
    expect(classifyWordIndexability(undefined)).toBe("empty");
    expect(classifyWordIndexability({ meanings: [{ meaning: " " }] })).toBe("empty");
  });

  it("deduplicates pointer targets from meanings and relations", () => {
    expect(
      getPointerTargetNames({
        meanings: [{ meaning: "Bakınız: ağabey" }],
        relatedWords: [
          { related_word_name: "ağabey" },
          { related_word_name: "abi" },
        ],
      }),
    ).toEqual(["ağabey", "abi"]);
  });
});
