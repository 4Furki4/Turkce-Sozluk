import SavedWords from "../[locale]/saved-words/page";

const mockSession = jest.fn();
const mockWords = jest.fn();
const mockCount = jest.fn();
jest.mock("@/src/trpc/server", () => ({
  getServerSession: () => mockSession(),
  api: { user: { getSavedWords: { prefetch: (input: unknown) => mockWords(input) }, getSavedWordCount: { prefetch: (input: unknown) => mockCount(input) } } },
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
});

test("prepares the first six newest saved words and the matching count before hydration", async () => {
  let finish!: () => void;
  mockWords.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  let rendered = false;
  const page = SavedWords({ params: Promise.resolve({ locale: "tr" }) }).then(value => { rendered = true; return value; });
  await Promise.resolve();
  await Promise.resolve();
  expect(mockWords).toHaveBeenCalledWith({ search: "", sortAlphabet: "az", sortDate: "dateDesc", sortBy: "date", take: 6, skip: 0 });
  expect(mockCount).toHaveBeenCalledWith({ search: "" });
  expect(rendered).toBe(false);
  finish();
  await page;
  expect(rendered).toBe(true);
  expect(mockSession).toHaveBeenCalledTimes(1);
});

test("an anonymous visit cannot prepare account data", async () => {
  mockSession.mockResolvedValue(null);
  await expect(SavedWords({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("sign-in redirect");
  expect(mockWords).not.toHaveBeenCalled();
  expect(mockCount).not.toHaveBeenCalled();
});
