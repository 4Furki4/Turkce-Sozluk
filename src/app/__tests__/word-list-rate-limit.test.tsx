import { render, screen } from "@testing-library/react";
import WordListPage from "../[locale]/word-list/page";

const mockWords = jest.fn();
const mockCount = jest.fn();
jest.mock("@/src/trpc/server", () => ({
    getServerQueryHelpers: async () => ({ word: { getWords: { fetch: mockWords }, getWordCount: { fetch: mockCount } } }),
    HydrateClient: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/src/_pages/word-list/word-list", () => ({ __esModule: true, default: () => <div>Usable word list</div> }));
jest.mock("@/src/components/customs/rate-limit-toast", () => ({ RateLimitNotification: () => <div>Rate limit toast signal</div> }));
jest.mock("@/src/components/progressive-enhancement/no-script-notice", () => ({ NoScriptNotice: () => null }));
jest.mock("@/src/i18n/routing", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
jest.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: jest.fn() }));

const renderPage = async () => render(await WordListPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ search: "kitap" }) }));

beforeEach(() => {
    mockWords.mockReset().mockResolvedValue([{ word_id: 1, name: "kitap", meaning: "book" }]);
    mockCount.mockReset().mockResolvedValue(1);
});

test("SSR reads list and count once while preserving the enhanced word list", async () => {
    await renderPage();
    expect(mockWords).toHaveBeenCalledTimes(1);
    expect(mockCount).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Usable word list")).toBeInTheDocument();
    expect(screen.queryByText("Rate limit toast signal")).not.toBeInTheDocument();
});

test.each(["list", "count", "both"])("a throttled %s keeps the page shell and signals the existing toaster", async (query) => {
    const error = Object.assign(new Error("slow down"), { code: "TOO_MANY_REQUESTS" });
    if (query !== "count") mockWords.mockRejectedValue(error);
    if (query !== "list") mockCount.mockRejectedValue(error);
    await renderPage();
    expect(screen.getByText("Usable word list")).toBeInTheDocument();
    expect(screen.getByText("Rate limit toast signal")).toBeInTheDocument();
});

test("database failures are not swallowed as rate limits", async () => {
    const error = new Error("database failed");
    mockCount.mockRejectedValue(error);
    await expect(renderPage()).rejects.toBe(error);
});
