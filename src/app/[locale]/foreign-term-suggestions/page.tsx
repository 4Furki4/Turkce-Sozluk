import { ForeignTermSuggestionsList } from "@/src/_pages/foreign-term-suggestions/ForeignTermSuggestionsList";
import { ForeignTermSuggestionModal } from "@/src/components/foreign-term-suggestions";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { suggestionStatusEnum } from "@/db/schema/foreign_term_suggestions";
import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

type SearchParams = { [key: string]: string | string[] | undefined };

interface ForeignTermSuggestionsPageProps {
    params: Promise<{
        locale: string;
    }>;
    searchParams: Promise<SearchParams>;
}

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

const getSuggestionHref = (locale: string, nextParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(nextParams)) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    }

    return `/${locale === "en" ? "en/foreign-term-suggestions" : "tr/yabanci-kelimelere-karsiliklar"}${params.toString() ? `?${params.toString()}` : ""}`;
};

export async function generateMetadata({
    params,
}: ForeignTermSuggestionsPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "ForeignTermSuggestions" });

    return {
        title: t("title"),
        description: t("subtitle"),
    };
}

export default async function ForeignTermSuggestionsPage({
    params,
    searchParams,
}: ForeignTermSuggestionsPageProps) {
    const { locale } = await params;
    const query = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("ForeignTermSuggestions");
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const page = toPositiveNumber(query.page, 1);
    const limit = 10;
    const status = toArrayParam(query.status).filter((value): value is (typeof suggestionStatusEnum.enumValues)[number] =>
        suggestionStatusEnum.enumValues.includes(value as any),
    );
    const sortBy = (toStringParam(query.sortBy, "votes") as "votes" | "createdAt");
    const sortOrder = (toStringParam(query.sortOrder, "desc") as "asc" | "desc");
    const firstPageInput = {
        limit,
        status: status.length ? status : undefined,
        sortBy,
        sortOrder,
    };

    void api.foreignTermSuggestion.list.prefetchInfinite(firstPageInput);
    void api.foreignTermSuggestion.getLanguages.prefetch();

    let fallbackData = await api.foreignTermSuggestion.list(firstPageInput);
    for (let currentPage = 1; currentPage < page && fallbackData.nextCursor; currentPage += 1) {
        fallbackData = await api.foreignTermSuggestion.list({
            ...firstPageInput,
            cursor: fallbackData.nextCursor,
        });
    }

    return (
        <HydrateClient>
            <div className="container mx-auto py-8 px-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-fs-1 font-bold">{t("title")}</h1>
                        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
                    </div>
                    <ForeignTermSuggestionModal session={session} className="hidden sm:inline-flex">
                        {t("submitSuggestion")}
                    </ForeignTermSuggestionModal>
                </div>

                <NoScriptNotice>
                    {locale === "en"
                        ? "JavaScript is disabled. Suggestion submission and voting require JavaScript, but the public suggestions list is available below."
                        : "JavaScript kapalı. Öneri gönderimi ve oylama JavaScript gerektirir; herkese açık öneri listesi aşağıda kullanılabilir."}
                </NoScriptNotice>
                <noscript>
                    <section className="mb-6 rounded-md border border-border bg-background/40 p-4">
                        <form method="get" action={locale === "en" ? "/en/foreign-term-suggestions" : "/tr/yabanci-kelimelere-karsiliklar"} className="grid gap-3 sm:grid-cols-3">
                            <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="status" defaultValue={status.join(",")}>
                                <option value="">{locale === "en" ? "All statuses" : "Tüm durumlar"}</option>
                                {suggestionStatusEnum.enumValues.map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                ))}
                            </select>
                            <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="sortBy" defaultValue={sortBy}>
                                <option value="votes">{locale === "en" ? "Votes" : "Oylar"}</option>
                                <option value="createdAt">{locale === "en" ? "Date" : "Tarih"}</option>
                            </select>
                            <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="sortOrder" defaultValue={sortOrder}>
                                <option value="desc">{locale === "en" ? "Descending" : "Azalan"}</option>
                                <option value="asc">{locale === "en" ? "Ascending" : "Artan"}</option>
                            </select>
                            <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground sm:col-span-3" type="submit">
                                {locale === "en" ? "Apply" : "Uygula"}
                            </button>
                        </form>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {fallbackData.items.map((item) => (
                                <article key={item.suggestion.id} className="rounded-md border border-border bg-background/40 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>{item.user?.name ?? (locale === "en" ? "Anonymous" : "Anonim")}</span>
                                        <span>{new Date(item.suggestion.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}</span>
                                    </div>
                                    <h2 className="mt-2 text-lg font-semibold">{item.suggestion.foreignTerm}</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.suggestion.foreignMeaning}</p>
                                    <p className="mt-3 text-sm">
                                        {locale === "en" ? "Suggested Turkish word" : "Önerilen Türkçe karşılık"}:{" "}
                                        <span className="font-medium text-primary">{item.suggestion.suggestedTurkishWord}</span>
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-md bg-background/60 px-2 py-1">{item.language?.language_tr ?? item.language?.language_en}</span>
                                        <span className="rounded-md bg-background/60 px-2 py-1">{item.suggestion.status}</span>
                                        <span className="rounded-md bg-background/60 px-2 py-1">{locale === "en" ? "Votes" : "Oy"}: {item.voteCount}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <nav className="mt-4 flex gap-2">
                            {page > 1 ? (
                                <a className="rounded-md border border-border bg-background/40 px-3 py-1.5" href={getSuggestionHref(locale, { page: page - 1, status: status.join(","), sortBy, sortOrder })}>
                                    {locale === "en" ? "Previous" : "Önceki"}
                                </a>
                            ) : null}
                            {fallbackData.nextCursor ? (
                                <a className="rounded-md border border-border bg-background/40 px-3 py-1.5" href={getSuggestionHref(locale, { page: page + 1, status: status.join(","), sortBy, sortOrder })}>
                                    {locale === "en" ? "Next" : "Sonraki"}
                                </a>
                            ) : null}
                        </nav>
                    </section>
                </noscript>

                <ForeignTermSuggestionModal className="w-full mb-6 sm:hidden" session={session}>
                    {t("submitSuggestion")}
                </ForeignTermSuggestionModal>

                <ForeignTermSuggestionsList session={session} />
            </div>
        </HydrateClient>
    );
}
