import { SearchHistoryList } from "@/src/_pages/dashboard/search-history/search-history-list";
import { api, HydrateClient } from "@/src/trpc/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.searchHistory" });

    return {
        title: t("title"),
    };
}

export default async function DashboardSearchHistoryPage() {
    await api.admin.searchHistory.list.prefetch({
        page: 1,
        limit: 20,
        actor: "all",
        sortOrder: "desc",
    });

    return (
        <HydrateClient>
            <SearchHistoryList />
        </HydrateClient>
    );
}
