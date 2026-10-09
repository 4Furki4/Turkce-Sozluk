import { act, renderHook } from "@testing-library/react";
import { useLocalSearchSuggestions } from "../use-local-search-suggestions";
import { searchAutocompleteOffline, searchByPattern } from "@/src/lib/offline-db";

jest.mock("@/src/lib/offline-db", () => ({ searchAutocompleteOffline: jest.fn(), searchByPattern: jest.fn() }));
const search = jest.mocked(searchAutocompleteOffline);
const pattern = jest.mocked(searchByPattern);
beforeEach(() => { jest.useFakeTimers(); jest.resetAllMocks(); });
afterEach(() => jest.useRealTimers());

test("starts local suggestions after 80 ms and hides an obsolete lookup immediately", async () => {
  let finishOld!: (words: string[]) => void;
  search.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; })).mockResolvedValueOnce(["su"]);
  const { result, rerender } = renderHook(({ input }) => useLocalSearchSuggestions(input, true), { initialProps: { input: "kit" } });
  await act(async () => { jest.advanceTimersByTime(79); });
  expect(search).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(search).toHaveBeenCalledWith("kit");
  rerender({ input: "su" });
  await act(async () => { jest.advanceTimersByTime(80); });
  expect(result.current.recommendations).toEqual(["su"]);
  await act(async () => { finishOld(["kitap"]); });
  expect(result.current.recommendations).toEqual(["su"]);
  rerender({ input: "s" });
  expect(result.current.recommendations).toEqual([]);
});

test("preserves pattern result order and clears results when changing search mode", async () => {
  pattern.mockResolvedValue([{ word_name: "göz" }, { word_name: "güz" }] as never);
  const { result, rerender } = renderHook(({ enabled }) => useLocalSearchSuggestions("g_z", enabled), { initialProps: { enabled: true } });
  await act(async () => { jest.advanceTimersByTime(80); });
  expect(result.current.recommendations).toEqual(["göz", "güz"]);
  expect(search).not.toHaveBeenCalled();
  rerender({ enabled: false });
  expect(result.current.recommendations).toEqual([]);
});
