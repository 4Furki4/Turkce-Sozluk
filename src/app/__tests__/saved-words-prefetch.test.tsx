import SavedWords from "../[locale]/saved-words/page";
import { waitFor } from "@testing-library/react";

const mockSession = jest.fn();
const mockWords = jest.fn();
const mockCount = jest.fn();
const mockCollections = jest.fn();
jest.mock("@/src/trpc/server", () => ({
  getServerSession: () => mockSession(),
  api: { user: { getSavedWords: { prefetch: (input: unknown) => mockWords(input) }, getSavedWordCount: { prefetch: (input: unknown) => mockCount(input) }, getSavedWordCollections: { prefetch: () => mockCollections() } } },
  HydrateClient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/src/components/customs/saved-words-page", () => ({ __esModule: true, default: () => null }));
jest.mock("next/navigation", () => ({
  RedirectType: { replace: "replace" },
}));
jest.mock("@/src/i18n/routing", () => ({
  redirect: () => { throw new Error("sign-in redirect"); },
}));

beforeEach(() => {
  mockSession.mockReset().mockResolvedValue({ user: { id: "current-reader" } });
  mockWords.mockReset().mockResolvedValue(undefined);
  mockCount.mockReset().mockResolvedValue(undefined);
  mockCollections.mockReset().mockResolvedValue(undefined);
});

test("prepares the first six newest saved words and the matching count before hydration", async () => {
  let finish!: () => void;
  mockWords.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  let rendered = false;
  const page = SavedWords({ params: Promise.resolve({ locale: "tr" }) }).then(value => { rendered = true; return value; });
  await waitFor(() => expect(mockWords).toHaveBeenCalled());
  expect(mockWords).toHaveBeenCalledWith({ search: "", sortAlphabet: "az", sortDate: "dateDesc", sortBy: "date", take: 6, skip: 0 });
  expect(mockCount).toHaveBeenCalledWith({ search: "" });
  expect(rendered).toBe(false);
  finish();
  await page;
  expect(rendered).toBe(true);
  expect(mockSession).toHaveBeenCalledTimes(1);
  expect(mockCollections).toHaveBeenCalledTimes(1);
});

test("an anonymous visit cannot prepare account data", async () => {
  mockSession.mockResolvedValue(null);
  await expect(SavedWords({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("sign-in redirect");
  expect(mockWords).not.toHaveBeenCalled();
  expect(mockCount).not.toHaveBeenCalled();
  expect(mockCollections).not.toHaveBeenCalled();
});

test("prepares matching URL filters plus the independent library total", async () => {
  const collectionId = "00000000-0000-4000-8000-000000000001";
  const result = await SavedWords({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ search: "kitap", sort: "za", page: "2", perPage: "12", collectionId }) });
  expect(mockWords).toHaveBeenCalledWith({ search: "kitap", sortAlphabet: "za", sortDate: "dateDesc", sortBy: "alphabet", take: 12, skip: 12, collectionId });
  expect(mockCount).toHaveBeenCalledWith({ search: "kitap", collectionId });
  expect(mockCount).toHaveBeenCalledWith({ search: "" });
  expect(mockCount).toHaveBeenCalledTimes(2);
  expect(result.props.children.props.initialState).toEqual({ search: "kitap", sort: "za", page: 2, perPage: 12, collectionId });
});

test("an explicitly empty collection remains scoped during prefetch", async () => {
  await SavedWords({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ collectionId: "" }) });
  expect(mockWords.mock.calls[0][0]).toHaveProperty("collectionId", "");
  expect(mockCount.mock.calls[0][0]).toEqual({ search: "", collectionId: "" });
});
