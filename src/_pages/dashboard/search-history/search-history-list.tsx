"use client";

import { useCallback, useState, type Key } from "react";
import { Button, Card, CardBody, User } from "@heroui/react";
import { Pagination } from "@heroui/pagination";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { FilterX, SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CustomDateRangePicker } from "@/src/components/customs/heroui/custom-date-range-picker";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomSelect } from "@/src/components/customs/heroui/custom-select";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/react";

type ActorFilter = "all" | "authenticated" | "anonymous";
type SortOrder = "asc" | "desc";

type SearchHistoryFilters = {
    wordQuery: string;
    userQuery: string;
    actor: ActorFilter;
    sortOrder: SortOrder;
    startDate: Date | null;
    endDate: Date | null;
};

type SearchHistoryEntry = {
    id: number;
    wordId: number;
    wordName: string;
    searchedAt: Date;
    user: {
        id: string | null;
        name: string | null;
        username: string | null;
        image: string | null;
    } | null;
};

const initialFilters: SearchHistoryFilters = {
    wordQuery: "",
    userQuery: "",
    actor: "all",
    sortOrder: "desc",
    startDate: null,
    endDate: null,
};

const pageSizeOptions = {
    "10": "10",
    "20": "20",
    "50": "50",
    "100": "100",
};

export function SearchHistoryList() {
    const locale = useLocale();
    const t = useTranslations("Dashboard.searchHistory");
    const tCommon = useTranslations("Common");

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [filters, setFilters] = useState<SearchHistoryFilters>(initialFilters);

    const debouncedWordQuery = useDebounce(filters.wordQuery, 500);
    const debouncedUserQuery = useDebounce(filters.userQuery, 500);

    const { data, isLoading } = api.admin.searchHistory.list.useQuery({
        page,
        limit: itemsPerPage,
        wordQuery: debouncedWordQuery || undefined,
        userQuery: debouncedUserQuery || undefined,
        actor: filters.actor,
        sortOrder: filters.sortOrder,
        startDate: filters.startDate ?? undefined,
        endDate: filters.endDate ?? undefined,
    });

    const updateFilters = (updates: Partial<SearchHistoryFilters>) => {
        setFilters((current) => ({ ...current, ...updates }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters(initialFilters);
        setPage(1);
    };

    const hasActiveFilters =
        filters.wordQuery.trim() !== "" ||
        filters.userQuery.trim() !== "" ||
        filters.actor !== "all" ||
        filters.sortOrder !== "desc" ||
        filters.startDate !== null ||
        filters.endDate !== null;

    const columns = [
        { key: "user", label: t("table.user") },
        { key: "word", label: t("table.word") },
        { key: "searchedAt", label: t("table.searchedAt") },
    ];

    const actorOptions: Record<ActorFilter, string> = {
        all: t("actor.all"),
        authenticated: t("actor.authenticated"),
        anonymous: t("actor.anonymous"),
    };

    const sortOrderOptions: Record<SortOrder, string> = {
        desc: t("sort.newest"),
        asc: t("sort.oldest"),
    };

    const renderCell = useCallback((item: object, columnKey: Key) => {
        const entry = item as SearchHistoryEntry;
        const userName = entry.user?.id
            ? entry.user.name || entry.user.username || tCommon("anonymousUser")
            : t("anonymous");

        switch (columnKey) {
            case "user":
                return entry.user?.id ? (
                    <User
                        name={
                            <Link
                                href={{
                                    pathname: "/profile/[id]",
                                    params: { id: entry.user.id },
                                }}
                                className="text-primary hover:underline"
                            >
                                {userName}
                            </Link>
                        }
                        description={entry.user.username ? `@${entry.user.username}` : entry.user.id.slice(0, 10)}
                        avatarProps={{
                            name: userName,
                            src: entry.user.image ?? undefined,
                        }}
                    />
                ) : t("anonymous");
            case "word":
                return (
                    <Link
                        href={{
                            pathname: "/search/[word]",
                            params: { word: entry.wordName },
                        }}
                        className="font-medium text-primary hover:underline"
                    >
                        {entry.wordName}
                    </Link>
                );
            case "searchedAt":
                return (
                    <time className="font-mono text-sm" dateTime={entry.searchedAt.toISOString()}>
                        {format(entry.searchedAt, "PPp", { locale: locale === "tr" ? tr : enUS })}
                    </time>
                );
            default:
                return null;
        }
    }, [locale, t, tCommon]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-serif text-foreground">{t("title")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <Card isBlurred className="bg-background/40">
                <CardBody className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold">{t("filters.title")}</h2>
                        {hasActiveFilters && (
                            <Button
                                size="sm"
                                variant="ghost"
                                color="danger"
                                startContent={<FilterX size={16} />}
                                onPress={clearFilters}
                            >
                                {t("filters.clear")}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                        <CustomInput
                            size="sm"
                            placeholder={t("filters.wordPlaceholder")}
                            value={filters.wordQuery}
                            onValueChange={(wordQuery) => updateFilters({ wordQuery })}
                            startContent={<SearchIcon size={16} />}
                            isClearable
                        />
                        <CustomInput
                            size="sm"
                            placeholder={t("filters.userPlaceholder")}
                            value={filters.userQuery}
                            onValueChange={(userQuery) => updateFilters({ userQuery })}
                            startContent={<SearchIcon size={16} />}
                            isClearable
                        />
                        <CustomSelect
                            label={t("filters.actor")}
                            options={actorOptions}
                            selectedKeys={[filters.actor]}
                            onSelectionChange={(keys) => {
                                const actor = Array.from(keys)[0] as ActorFilter | undefined;
                                if (actor) updateFilters({ actor });
                            }}
                        />
                        <CustomDateRangePicker
                            label={t("filters.dateRange")}
                            value={filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : null}
                            onDateRangeChange={(startDate, endDate) => updateFilters({ startDate, endDate })}
                            classNames={{ base: "w-full sm:max-w-none" }}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <CustomSelect
                            label={t("filters.sortOrder")}
                            options={sortOrderOptions}
                            selectedKeys={[filters.sortOrder]}
                            onSelectionChange={(keys) => {
                                const sortOrder = Array.from(keys)[0] as SortOrder | undefined;
                                if (sortOrder) updateFilters({ sortOrder });
                            }}
                        />
                        <CustomSelect
                            label={t("filters.itemsPerPage")}
                            options={pageSizeOptions}
                            selectedKeys={[String(itemsPerPage)]}
                            onSelectionChange={(keys) => {
                                const nextLimit = Number(Array.from(keys)[0]);
                                if (Number.isFinite(nextLimit)) {
                                    setItemsPerPage(nextLimit);
                                    setPage(1);
                                }
                            }}
                        />
                    </div>
                </CardBody>
            </Card>

            <CustomTable
                columns={columns}
                items={data?.entries ?? []}
                renderCell={renderCell}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={t("empty")}
                aria-label={t("table.ariaLabel")}
            />

            <Pagination
                isDisabled={!data?.totalPages}
                classNames={{
                    wrapper: ["mx-auto"]
                }}
                isCompact
                showControls
                total={data?.totalPages || 1}
                page={page}
                onChange={setPage}
            />
        </div>
    );
}
