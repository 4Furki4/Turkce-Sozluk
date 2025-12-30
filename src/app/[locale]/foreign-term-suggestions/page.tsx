import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, HydrateClient } from "@/src/trpc/server";
import { auth } from "@/src/lib/auth";
import { ForeignTermSuggestionsList } from "@/src/_pages/foreign-term-suggestions/ForeignTermSuggestionsList";
import { ForeignTermSuggestionModal } from "@/src/components/foreign-term-suggestions";
import { headers } from "next/headers";
import { Metadata } from "next";

interface ForeignTermSuggestionsPageProps {
    params: Promise<{
        locale: string;
    }>;
}

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
}: ForeignTermSuggestionsPageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("ForeignTermSuggestions");
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    // Prefetch with default filters
    void api.foreignTermSuggestion.list.prefetchInfinite({
        limit: 10,
        sortBy: "votes",
        sortOrder: "desc",
    });

    // Prefetch languages for the form
    void api.foreignTermSuggestion.getLanguages.prefetch();

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

                <ForeignTermSuggestionModal className="w-full mb-6 sm:hidden" session={session}>
                    {t("submitSuggestion")}
                </ForeignTermSuggestionModal>

                <ForeignTermSuggestionsList session={session} />
            </div>
        </HydrateClient>
    );
}
