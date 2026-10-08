jest.mock("@/src/trpc/react", () => ({ api: { word: { getAutocompleteListVersion: { useQuery: () => ({ data: "probe-version" }) } } } }));
jest.mock("@/src/hooks/use-online-status", () => ({ useOnlineStatus: () => true }));
jest.mock("@/src/lib/offline-db", () => ({ getLocalAutocompleteVersion: jest.fn(), updateLocalAutocompleteList: jest.fn() }));
jest.mock("@/src/lib/autocomplete-sync-status", () => ({ emitAutocompleteSyncStatus: jest.fn() }));
import { render, waitFor } from "@testing-library/react";
import { AutocompleteSync } from "../complete-sync";
import { getLocalAutocompleteVersion, updateLocalAutocompleteList } from "@/src/lib/offline-db";
import { emitAutocompleteSyncStatus } from "@/src/lib/autocomplete-sync-status";

const originalTimeout = AbortSignal.timeout;
beforeAll(() => Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: () => new AbortController().signal }));
afterAll(() => Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: originalTimeout }));

beforeEach(() => {
  jest.clearAllMocks();
  (getLocalAutocompleteVersion as jest.Mock).mockResolvedValue("older-version");
  global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => "download-version" }, json: async () => ["kitap", "ağaç"] });
});
afterEach(() => jest.restoreAllMocks());

test("persists the downloaded list's version when the version probe is older", async () => {
  render(<AutocompleteSync />);
  await waitFor(() => expect(updateLocalAutocompleteList).toHaveBeenCalledWith(["kitap", "ağaç"], "download-version"));
});

test("does not label unversioned data with the earlier probe's version", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, headers: { get: () => null }, json: async () => ["kitap"] });
  render(<AutocompleteSync />);
  await waitFor(() => expect(emitAutocompleteSyncStatus).toHaveBeenCalledWith("error"));
  expect(updateLocalAutocompleteList).not.toHaveBeenCalled();
});

test("retains the existing download skip when the stored version matches", async () => {
  (getLocalAutocompleteVersion as jest.Mock).mockResolvedValue("probe-version");
  render(<AutocompleteSync />);
  await waitFor(() => expect(emitAutocompleteSyncStatus).toHaveBeenCalledWith("ready"));
  expect(global.fetch).not.toHaveBeenCalled();
});
