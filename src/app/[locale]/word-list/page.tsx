import WordList from "@/src/_pages/word-list/word-list";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { Link } from "@/src/i18n/routing";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type SearchParams = { [key: string]: string | string[] | undefined };

type Props = {
    params: Promise<{
        locale: string;
    }>;
    searchParams: Promise<SearchParams>;
};

const toStringParam = (value: string | string[] | undefined, fallback = "") =>
    Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

const toArrayParam = (value: string | string[] | undefined) =>
    toStringParam(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const toPositiveNumber = (value: string | string[] | undefined, fallback: number) => {
    const parsed = Number(toStringParam(value));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getWordListHref = (locale: string, nextParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(nextParams)) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    }

    return `/${locale === "en" ? "en/word-list" : "tr/kelime-listesi"}${params.toString() ? `?${params.toString()}` : ""}`;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "WordList" });
    return {
        title: t("title"),
        description: t("description"),
        openGraph: {
            title: t("title"),
            description: t("description"),
            type: "website",
        },
    };
}

export default async function WordListPage({ params, searchParams }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const search_params = await searchParams;
    const page = toPositiveNumber(search_params.page, 1);
    const perPage = toPositiveNumber(search_params.per_page, 10);
    const search = toStringParam(search_params.search);
    const selectedPos = toArrayParam(search_params.pos);
    const selectedLang = toArrayParam(search_params.lang);
    const selectedAttr = toArrayParam(search_params.attr);
    const sortBy = (toStringParam(search_params.sort, "alphabetical") as "alphabetical" | "date" | "length");
    const sortOrder = (toStringParam(search_params.order, "asc") as "asc" | "desc");
    const selectedLetter = toStringParam(search_params.letter) || undefined;

    const queryInput = {
        take: perPage,
        skip: (page - 1) * perPage,
        search,
        partOfSpeechId: selectedPos,
        languageId: selectedLang,
        attributeId: selectedAttr,
        sortBy,
        sortOrder,
        startsWith: selectedLetter,
    };
    const countInput = {
        search,
        partOfSpeechId: selectedPos,
        languageId: selectedLang,
        attributeId: selectedAttr,
        startsWith: selectedLetter,
    };

    void api.word.getWords.prefetch(queryInput);
    void api.word.getWordCount.prefetch(countInput);

    const [words, wordCount] = await Promise.all([
        api.word.getWords(queryInput),
        api.word.getWordCount(countInput),
    ]);
    const totalPages = Math.max(1, Math.ceil(wordCount / perPage));

    return (
        <main className="max-w-7xl w-full mx-auto p-4">
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is disabled, so live filters are unavailable. Use the form and pagination links below for the server-rendered word list."
                    : "JavaScript kapalı olduğu için canlı filtreler kullanılamıyor. Sunucuda oluşturulan kelime listesi için aşağıdaki formu ve sayfa bağlantılarını kullanın."}
            </NoScriptNotice>
            <noscript>
                <section className="mb-6 rounded-md border border-border bg-background/40 p-4">
                    <form method="get" action={locale === "en" ? "/en/word-list" : "/tr/kelime-listesi"} className="grid gap-3 sm:grid-cols-4">
                        <input
                            className="rounded-md border border-border bg-background/60 px-3 py-2 sm:col-span-2"
                            type="search"
                            name="search"
                            defaultValue={search}
                            placeholder={locale === "en" ? "Search words" : "Kelime ara"}
                        />
                        <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="sort" defaultValue={sortBy}>
                            <option value="alphabetical">{locale === "en" ? "Alphabetical" : "Alfabetik"}</option>
                            <option value="date">{locale === "en" ? "Date" : "Tarih"}</option>
                            <option value="length">{locale === "en" ? "Length" : "Uzunluk"}</option>
                        </select>
                        <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="order" defaultValue={sortOrder}>
                            <option value="asc">{locale === "en" ? "Ascending" : "Artan"}</option>
                            <option value="desc">{locale === "en" ? "Descending" : "Azalan"}</option>
                        </select>
                        <input type="hidden" name="per_page" value={perPage} />
                        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground sm:col-span-4" type="submit">
                            {locale === "en" ? "Apply" : "Uygula"}
                        </button>
                    </form>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-2 pr-4">{locale === "en" ? "Word" : "Kelime"}</th>
                                    <th className="py-2">{locale === "en" ? "Meaning" : "Anlam"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {words.map((word) => (
                                    <tr key={word.word_id} className="border-b border-border/60">
                                        <td className="py-2 pr-4">
                                            <Link className="text-primary hover:underline" href={{ pathname: "/search/[word]", params: { word: word.name } }}>
                                                {word.name}
                                            </Link>
                                        </td>
                                        <td className="py-2 text-muted-foreground">
                                            {word.meaning || (word.related_word_name ? (
                                                <span>
                                                    {locale === "en" ? "See also" : "Bakınız"}{" "}
                                                    <Link className="text-primary hover:underline" href={{ pathname: "/search/[word]", params: { word: word.related_word_name } }}>
                                                        {word.related_word_name}
                                                    </Link>
                                                </span>
                                            ) : locale === "en" ? "No meaning found" : "Anlam bulunamadı")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <nav className="mt-4 flex flex-wrap gap-2" aria-label={locale === "en" ? "Word list pages" : "Kelime listesi sayfaları"}>
                        {Array.from({ length: totalPages }, (_, index) => index + 1)
                            .slice(Math.max(0, page - 4), page + 3)
                            .map((targetPage) => (
                                <a
                                    key={targetPage}
                                    href={getWordListHref(locale, { page: targetPage, per_page: perPage, search, sort: sortBy, order: sortOrder, letter: selectedLetter })}
                                    aria-current={targetPage === page ? "page" : undefined}
                                    className={`rounded-md border px-3 py-1.5 ${targetPage === page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/40"}`}
                                >
                                    {targetPage}
                                </a>
                            ))}
                    </nav>
                </section>
            </noscript>
            <HydrateClient>
                <WordList />
            </HydrateClient>
        </main>
    );
}
