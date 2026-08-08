jest.mock("@/db", () => ({
  db: {},
}));

import fs from "node:fs";
import path from "node:path";

import {
  findWordDataByName,
  normalizeWordLookupName,
} from "@/src/server/word-queries";

describe("word queries", () => {
  it("normalizes the lookup key", () => {
    expect(normalizeWordLookupName("  çeviri\n ")).toBe("çeviri");
  });

  it("keeps only word-data rows from the database result", async () => {
    const wordData = { word_id: 42, word_name: "çeviri" };
    const execute = jest.fn().mockResolvedValue([
      { word_data: wordData },
      null,
      {},
    ]);

    await expect(
      findWordDataByName("çeviri", { execute } as never),
    ).resolves.toEqual([{ word_data: wordData }]);
  });

  it("keeps the request-bound server lookup out of Cache Components", () => {
    const querySource = fs.readFileSync(
      path.join(__dirname, "..", "word-queries.ts"),
      "utf8",
    );

    expect(querySource).not.toMatch(/["']use cache["']/);
  });
});
