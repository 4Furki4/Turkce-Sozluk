import { render, screen } from "@testing-library/react";
import { getStaticRouteCanonicalUrl } from "@/src/lib/seo-utils";
import WordListPage, { generateMetadata } from "../[locale]/word-list/page";

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

const getMetadata = (searchParams: Record<string, string | string[] | undefined>, locale = "tr") =>
    generateMetadata({ params: Promise.resolve({ locale }), searchParams: Promise.resolve(searchParams) });

describe("word list canonical URL", () => {
    const baseUrl = getStaticRouteCanonicalUrl("/word-list");

    test.each([
        { page: "2" },
        { page: "02", utm_source: "newsletter", view: "grid", per_page: "10", search: "", sort: "alphabetical", order: "asc" },
    ])("preserves the page number and removes cosmetic or default parameters from %o", async (params) => {
        mockCount.mockResolvedValue(11);
        const metadata = await getMetadata(params);

        expect(metadata.alternates?.canonical).toBe(`${baseUrl}?page=2`);
        expect(mockCount).toHaveBeenCalledTimes(1);
    });

    test.each([
        {},
        { page: "1" },
        { page: "2.5" },
        { page: "9007199254740992" },
        { page: "2", search: "kitap" },
        { page: "2", letter: "k" },
        { page: "2", pos: "1" },
        { page: "2", pos: "," },
        { page: "2", lang: "1" },
        { page: "2", attr: "1" },
        { page: "2", sort: "date" },
        { page: "2", order: "desc" },
        { page: "2", per_page: "20" },
    ])("uses the base canonical without a metadata read for %o", async (params) => {
        const metadata = await getMetadata(params);

        expect(metadata.alternates?.canonical).toBe(baseUrl);
        expect(mockCount).not.toHaveBeenCalled();
    });

    test("uses the base canonical for a page beyond the last result", async () => {
        const metadata = await getMetadata({ page: "2" });

        expect(metadata.alternates?.canonical).toBe(baseUrl);
    });

    test("uses the base canonical when the count is throttled", async () => {
        mockCount.mockRejectedValue(Object.assign(new Error("slow down"), { code: "TOO_MANY_REQUESTS" }));
        const metadata = await getMetadata({ page: "2" });

        expect(metadata.alternates?.canonical).toBe(baseUrl);
    });

    test("keeps English pagination on the existing base canonical", async () => {
        const metadata = await getMetadata({ page: "2" }, "en");

        expect(metadata.alternates?.canonical).toBe(getStaticRouteCanonicalUrl("/word-list", "en"));
        expect(mockCount).not.toHaveBeenCalled();
    });
});
