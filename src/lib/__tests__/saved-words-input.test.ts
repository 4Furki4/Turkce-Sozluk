import { getSavedWordsCountInput, getSavedWordsInput, readSavedWordsState, savedWordsInitialInput, serializeSavedWordsState } from "../saved-words-input";

test("default library state shares the original server/client query key", () => {
  const state = readSavedWordsState();
  expect(getSavedWordsInput(state)).toEqual(savedWordsInitialInput);
  expect(getSavedWordsCountInput(state)).toEqual({ search: "" });
  expect(serializeSavedWordsState(state)).toBe("");
});

test.each([
  ["dateDesc", "date", "dateDesc", "az"],
  ["dateAsc", "date", "dateAsc", "az"],
  ["az", "alphabet", "dateDesc", "az"],
  ["za", "alphabet", "dateDesc", "za"],
])("one %s sort has an unambiguous query mapping", (sort, sortBy, sortDate, sortAlphabet) => {
  expect(getSavedWordsInput(readSavedWordsState({ sort }))).toMatchObject({ sortBy, sortDate, sortAlphabet });
});

test("state round trips Turkish text, pagination and collection scope", () => {
  const values = { search: "ışık ve gönül", sort: "za", page: "3", perPage: "24", collectionId: "00000000-0000-4000-8000-000000000001" };
  const state = readSavedWordsState(values);
  expect(readSavedWordsState(new URLSearchParams(serializeSavedWordsState(state)))).toEqual(state);
  expect(getSavedWordsInput(state)).toMatchObject({ search: values.search, skip: 48, take: 24, collectionId: values.collectionId });
});

test.each(["", "not-a-uuid"])("an explicitly invalid collection %s cannot silently broaden the library", collectionId => {
  const state = readSavedWordsState({ collectionId });
  expect(state).toHaveProperty("collectionId", collectionId);
  expect(getSavedWordsInput(state)).toHaveProperty("collectionId", collectionId);
  expect(getSavedWordsCountInput(state)).toHaveProperty("collectionId", collectionId);
  expect(new URLSearchParams(serializeSavedWordsState(state)).get("collectionId")).toBe(collectionId);
});

test("untrusted URL ranges are bounded and repeated parameters use their first value", () => {
  expect(readSavedWordsState({ search: "a".repeat(300), page: "-8", perPage: "100000", sort: ["az", "za"] })).toEqual({ search: "a".repeat(255), page: 1, perPage: 6, sort: "az" });
  expect(readSavedWordsState({ page: "1e100", perPage: "0", sort: "unknown" })).toMatchObject({ page: 1, perPage: 6, sort: "dateDesc" });
});
