/** @jest-environment node */
jest.mock("@/db", () => ({ db: { select: jest.fn() } }));
import { db } from "@/db";
import { getAutocompleteSnapshot } from "../autocomplete-dictionary";
import { invalidateDictionaryCache } from "../dictionary-cache";

afterEach(() => { invalidateDictionaryCache(); jest.useRealTimers(); jest.clearAllMocks(); });

test("an external update cannot attach a fresh version to an older cached word list", async () => {
  jest.useFakeTimers();
  let stored = { latest: "A", names: ["kitap"] };
  const from = jest.fn(async () => [{ ...stored, names: [...stored.names] }]);
  (db.select as jest.Mock).mockReturnValue({ from });
  expect(await getAutocompleteSnapshot(db)).toEqual({ version: "A", words: ["kitap"] });
  jest.advanceTimersByTime(20_000);
  stored = { latest: "B", names: ["kitap", "ağaç"] };
  expect(await getAutocompleteSnapshot(db)).toEqual({ version: "A", words: ["kitap"] });
  jest.advanceTimersByTime(10_001);
  expect(await getAutocompleteSnapshot(db)).toEqual({ version: "B", words: ["kitap", "ağaç"] });
  expect(from).toHaveBeenCalledTimes(2);
});

test("an empty dictionary still has a matching version and empty list", async () => {
  (db.select as jest.Mock).mockReturnValue({ from: async () => [{ latest: null, names: [] }] });
  expect(await getAutocompleteSnapshot(db)).toEqual({ version: "0", words: [] });
});
