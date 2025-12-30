"use client";

import { api } from "@/src/trpc/react";
import { useTranslations } from "next-intl";
import { Button, Skeleton, Spinner } from "@heroui/react";
import { CustomSelect } from "@/src/components/customs/heroui/custom-select";
import { useState, useMemo } from "react";
import { useDebounce } from "@/src/hooks/use-debounce";
import { suggestionStatusEnum } from "@/db/schema/foreign_term_suggestions";
import { Session } from "@/src/lib/auth";
import { ForeignTermSuggestionCard } from "@/src/components/foreign-term-suggestions";

interface ForeignTermSuggestionsListProps {
    session: Session | null;
}

type SortBy = "votes" | "createdAt";
type SortOrder = "asc" | "desc";

export function ForeignTermSuggestionsList({ session }: ForeignTermSuggestionsListProps) {
    const t = useTranslations("ForeignTermSuggestions");
    const [status, setStatus] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<SortBy>("votes");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const queryFilters = useMemo(
        () => ({
            limit: 10,
            status:
                status.length > 0
                    ? (status as (typeof suggestionStatusEnum.enumValues)[number][])
                    : undefined,
            sortBy,
            sortOrder,
        }),
        [status, sortBy, sortOrder]
    );

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = api.foreignTermSuggestion.list.useInfiniteQuery(queryFilters, {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const allItems = data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CustomSelect
                    label={t("filters.status")}
                    placeholder={t("filters.allStatuses")}
                    selectionMode="multiple"
                    selectedKeys={new Set(status)}
                    onSelectionChange={(keys) => setStatus(Array.from(keys) as string[])}
                    options={suggestionStatusEnum.enumValues.reduce(
                        (acc, s) => ({ ...acc, [s]: t(`card.${s}`) }),
                        {} as Record<string, string>
                    )}
                />

                <CustomSelect
                    label={t("filters.sortBy")}
                    selectedKeys={new Set([sortBy])}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as SortBy;
                        if (selected) setSortBy(selected);
                    }}
                    options={{
                        votes: t("filters.sortByVotes"),
                        createdAt: t("filters.sortByDate"),
                    }}
                />

                <CustomSelect
                    label={t("filters.sortOrder")}
                    selectedKeys={new Set([sortOrder])}
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as SortOrder;
                        if (selected) setSortOrder(selected);
                    }}
                    options={{
                        desc: t("filters.descending"),
                        asc: t("filters.ascending"),
                    }}
                />
            </div>

            {/* Suggestions List */}
            <div className="grid gap-4 md:grid-cols-2">
                {isLoading ? (
                    // Skeleton loading
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-64 rounded-lg">
                            <Skeleton className="h-full w-full rounded-lg" />
                        </div>
                    ))
                ) : allItems.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                        <p className="text-muted-foreground">{t("noSuggestions")}</p>
                    </div>
                ) : (
                    allItems.map((item) => (
                        <ForeignTermSuggestionCard
                            key={item.suggestion.id}
                            suggestion={item.suggestion}
                            user={item.user}
                            language={item.language}
                            voteCount={item.voteCount}
                            userVote={item.userVote}
                            isAuthenticated={!!session}
                        />
                    ))
                )}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
                <div className="text-center">
                    <Button
                        onPress={() => fetchNextPage()}
                        isLoading={isFetchingNextPage}
                        variant="bordered"
                    >
                        {isFetchingNextPage ? t("loading") : t("loadMore")}
                    </Button>
                </div>
            )}
        </div>
    );
}
