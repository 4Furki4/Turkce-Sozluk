import {
  getDictionarySuggestionRank,
  sortDictionarySuggestions,
} from "../search-suggestions";

describe("dictionary suggestion sorting", () => {
  it("prioritizes exact match before prefix and contains matches", () => {
    const sorted = sortDictionarySuggestions(
      [
        { id: 1, name: "gelip gitmek" },
        { id: 2, name: "gitmek" },
        { id: 3, name: "git" },
        { id: 4, name: "aklı gitmek" },
      ],
      "git",
    );

    expect(sorted.map((item) => item.name)).toEqual([
      "git",
      "gitmek",
      "aklı gitmek",
      "gelip gitmek",
    ]);
  });

  it("sorts alphabetically within the same match rank", () => {
    const sorted = sortDictionarySuggestions(
      [
        { name: "zeytin gitmek" },
        { name: "aklı gitmek" },
        { name: "bir yere gitmek" },
      ],
      "git",
    );

    expect(sorted.map((item) => item.name)).toEqual([
      "aklı gitmek",
      "bir yere gitmek",
      "zeytin gitmek",
    ]);
  });

  it("assigns lower rank to better matches", () => {
    expect(getDictionarySuggestionRank("git", "git")).toBe(0);
    expect(getDictionarySuggestionRank("gitmek", "git")).toBe(1);
    expect(getDictionarySuggestionRank("gelip gitmek", "git")).toBe(2);
  });
});
