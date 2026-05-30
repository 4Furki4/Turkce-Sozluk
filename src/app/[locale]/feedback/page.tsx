import { FeedbackList } from "@/src/_pages/feedback/feedback-list";
import { FeedbackModal } from "@/src/components/customs/modals/add-feedback";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";
import { feedbackStatusEnum, feedbackTypeEnum } from "@/db/schema/feedbacks";
import { auth } from "@/src/lib/auth";
import { api, HydrateClient } from "@/src/trpc/server";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

type SearchParams = { [key: string]: string | string[] | undefined };

interface FeedbackPageProps {
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

const getFeedbackHref = (locale: string, nextParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(nextParams)) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    }

    return `/${locale === "en" ? "en/feedback" : "tr/geri-bildirim"}${params.toString() ? `?${params.toString()}` : ""}`;
};

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
    const { locale } = await params;
    const query = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("Feedback");
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const page = toPositiveNumber(query.page, 1);
    const limit = 10;
    const type = toArrayParam(query.type).filter((value): value is (typeof feedbackTypeEnum.enumValues)[number] =>
        feedbackTypeEnum.enumValues.includes(value as any),
    );
    const status = toArrayParam(query.status).filter((value): value is (typeof feedbackStatusEnum.enumValues)[number] =>
        feedbackStatusEnum.enumValues.includes(value as any),
    );
    const searchTerm = toStringParam(query.searchTerm);
    const sortBy = (toStringParam(query.sortBy, "votes") as "votes" | "createdAt");
    const sortOrder = (toStringParam(query.sortOrder, "desc") as "asc" | "desc");
    const firstPageInput = {
        limit,
        type: type.length ? type : undefined,
        status: status.length ? status : undefined,
        searchTerm: searchTerm || undefined,
        sortBy,
        sortOrder,
    };

    void api.feedback.list.prefetch(firstPageInput);

    let fallbackData = await api.feedback.list(firstPageInput);
    for (let currentPage = 1; currentPage < page && fallbackData.nextCursor; currentPage += 1) {
        fallbackData = await api.feedback.list({
            ...firstPageInput,
            cursor: fallbackData.nextCursor,
        });
    }

    return (
        <HydrateClient>
            <div className="container mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-fs-1 font-bold">{t("title")}</h1>
                    <FeedbackModal session={session} className="hidden sm:inline-flex">
                        {t("submitFeedback")}
                    </FeedbackModal>
                </div>
                <p className="text-muted-foreground mb-8">{t("description")}</p>
                <NoScriptNotice>
                    {locale === "en"
                        ? "JavaScript is disabled. Feedback voting and the submission modal require JavaScript, but you can browse feedback with the form and page links below."
                        : "JavaScript kapalı. Geri bildirim oylama ve gönderim penceresi JavaScript gerektirir; yine de aşağıdaki form ve sayfa bağlantılarıyla listeyi gezebilirsiniz."}
                </NoScriptNotice>
                <noscript>
                    <section className="mb-6 rounded-md border border-border bg-background/40 p-4">
                        <form method="get" action={locale === "en" ? "/en/feedback" : "/tr/geri-bildirim"} className="grid gap-3 sm:grid-cols-4">
                            <input
                                className="rounded-md border border-border bg-background/60 px-3 py-2 sm:col-span-2"
                                type="search"
                                name="searchTerm"
                                defaultValue={searchTerm}
                                placeholder={locale === "en" ? "Search feedback" : "Geri bildirim ara"}
                            />
                            <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="sortBy" defaultValue={sortBy}>
                                <option value="votes">{locale === "en" ? "Votes" : "Oylar"}</option>
                                <option value="createdAt">{locale === "en" ? "Date" : "Tarih"}</option>
                            </select>
                            <select className="rounded-md border border-border bg-background/60 px-3 py-2" name="sortOrder" defaultValue={sortOrder}>
                                <option value="desc">{locale === "en" ? "Descending" : "Azalan"}</option>
                                <option value="asc">{locale === "en" ? "Ascending" : "Artan"}</option>
                            </select>
                            <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground sm:col-span-4" type="submit">
                                {locale === "en" ? "Apply" : "Uygula"}
                            </button>
                        </form>
                        <div className="mt-4 space-y-3">
                            {fallbackData.items.map((item) => (
                                <article key={item.feedback.id} className="rounded-md border border-border bg-background/40 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>{item.user?.name ?? (locale === "en" ? "Anonymous" : "Anonim")}</span>
                                        <span>{new Date(item.feedback.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR")}</span>
                                    </div>
                                    <h2 className="mt-2 text-lg font-semibold">{item.feedback.title}</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">{item.feedback.description}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-md bg-background/60 px-2 py-1">{item.feedback.type}</span>
                                        <span className="rounded-md bg-background/60 px-2 py-1">{item.feedback.status}</span>
                                        <span className="rounded-md bg-background/60 px-2 py-1">{locale === "en" ? "Votes" : "Oy"}: {item.voteCount}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <nav className="mt-4 flex gap-2">
                            {page > 1 ? (
                                <a className="rounded-md border border-border bg-background/40 px-3 py-1.5" href={getFeedbackHref(locale, { page: page - 1, searchTerm, sortBy, sortOrder, type: type.join(","), status: status.join(",") })}>
                                    {locale === "en" ? "Previous" : "Önceki"}
                                </a>
                            ) : null}
                            {fallbackData.nextCursor ? (
                                <a className="rounded-md border border-border bg-background/40 px-3 py-1.5" href={getFeedbackHref(locale, { page: page + 1, searchTerm, sortBy, sortOrder, type: type.join(","), status: status.join(",") })}>
                                    {locale === "en" ? "Next" : "Sonraki"}
                                </a>
                            ) : null}
                        </nav>
                    </section>
                </noscript>
                <FeedbackModal className="w-full mb-2 sm:hidden" session={session}>
                    {t("submitFeedback")}
                </FeedbackModal>

                <FeedbackList session={session} />
            </div>
        </HydrateClient>
    );
}
