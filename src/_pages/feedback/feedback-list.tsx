"use client";

import { api } from "@/src/trpc/react";
import { useTranslations } from "next-intl";
import { Avatar, Button, Card, CardBody, CardFooter, CardHeader, Chip } from "@heroui/react";
import { formatDate } from "@/src/utils/date";
import { toast } from "sonner";
import { type inferRouterOutputs, type inferRouterInputs } from "@trpc/server";
import { type AppRouter } from "@/src/server/api/root";
import { Session } from "next-auth";
import { FeedbackStatus, statusColorMap } from "../dashboard/feedback/feedback-list";
import { useCallback, useState, useMemo } from "react";
import { PublicFeedbackFilterBar, type PublicFeedbackFilters } from "@/src/_pages/feedback/public-feedback-filter-bar";
import { useDebounce } from "@/src/hooks/use-debounce";
import { feedbackTypeEnum, feedbackStatusEnum } from "@/db/schema/feedbacks";
import { FeedbackSkeleton } from "./skeleton";

import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

// Define the type for a single feedback item based on router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type RouterInput = inferRouterInputs<AppRouter>;
type FeedbackItem = RouterOutput["feedback"]["list"]["items"][number];
type FeedbackListInput = RouterInput["feedback"]["list"];
type InitialFeedbackData = RouterOutput["feedback"]["list"];

/**
 * Renders a single feedback card with details and voting button.
 */
function FeedbackCard({ item, session, queryFilters }: { item: FeedbackItem, session: Session | null, queryFilters: FeedbackListInput }) {
    const t = useTranslations("Feedback");
    const tDashboard = useTranslations("Dashboard.feedback");
    const utils = api.useUtils();

    const voteMutation = api.feedback.vote.useMutation({
        onMutate: async ({ feedbackId, voteType }) => {
            // Optimistic update
            await utils.feedback.list.cancel();
            const previousData = utils.feedback.list.getInfiniteData();

            utils.feedback.list.setInfiniteData(queryFilters, (oldData) => {
                if (!oldData) return previousData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        items: page.items.map((feedbackItem) => {
                            if (feedbackItem.feedback.id !== feedbackId) return feedbackItem;

                            const currentVote = feedbackItem.userVote;
                            const voteValue = voteType === 'up' ? 1 : -1;
                            let newVoteCount = Number(feedbackItem.voteCount);
                            let newUserVote = 0;

                            if (currentVote === voteValue) {
                                // Toggling off
                                newVoteCount -= voteValue;
                                newUserVote = 0;
                            } else if (currentVote === -voteValue) {
                                // Changing vote (e.g. from -1 to +1, diff is +2)
                                newVoteCount += 2 * voteValue;
                                newUserVote = voteValue;
                            } else {
                                // New vote (from 0 to +1 or -1)
                                newVoteCount += voteValue;
                                newUserVote = voteValue;
                            }

                            return {
                                ...feedbackItem,
                                userVote: newUserVote,
                                hasVoted: newUserVote !== 0,
                                voteCount: newVoteCount,
                            };
                        }),
                    })),
                };
            });

            return { previousData };
        },
        onError: (err, newVote, context) => {
            // Revert on error
            utils.feedback.list.setInfiniteData(queryFilters, context?.previousData);
            toast.error(t("voteError"));
        },
        onSettled: () => {
            utils.feedback.list.invalidate();
        },
    });

    const handleVote = (voteType: 'up' | 'down') => {
        if (!session) {
            toast.error(t('mustBeLoggedIn'));
            return;
        }
        voteMutation.mutate({ feedbackId: item.feedback.id, voteType });
    };

    const isUpvoteDisabled = useCallback((feedbackStatus: FeedbackStatus) => {
        const disabledStatuses: FeedbackStatus[] = ["closed", "rejected", "duplicate", "fixed", "wont_implement", "implemented"];
        if (disabledStatuses.includes(feedbackStatus)) return true;
    }, []);

    return (
        <Card classNames={{
            base: "bg-background/10",
        }} className="border border-border rounded-sm p-2 w-full mb-4" isBlurred >
            <CardHeader className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex gap-2 md:gap-4">
                    <Avatar
                        isBordered
                        radius="full"
                        size="md"
                        src={item.user?.image ?? undefined}
                        name={item.user?.name ?? t("anonymousUser")}
                    />
                    <div className="flex flex-col">
                        <p className="text-small text-default-500">
                            {item.user?.name ?? t("anonymousUser")}
                        </p>
                        <p className="text-small text-default-500">
                            {formatDate(item.feedback.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="sm:ml-auto flex flex-col xs:flex-row gap-2">
                    <Chip
                        color={statusColorMap[item.feedback.status]}
                        variant="flat" radius="sm" className="text-xs font-semibold uppercase px-2 py-1" size="sm"
                    >
                        {tDashboard(`statuses.${item.feedback.status}`)}
                    </Chip>
                    <Chip color={item.feedback.type === "feature" ? "success" : item.feedback.type === "bug" ? "danger" : "warning"} variant="flat" radius="sm" className="text-xs font-semibold uppercase px-2 py-1" size="sm">
                        {t(`types.${item.feedback.type}`)}
                    </Chip>
                </div>
            </CardHeader>
            <CardBody>
                <h3 className="text-xl font-semibold">{item.feedback.title}</h3>
                <p className="text-default-600">{item.feedback.description}</p>
            </CardBody>
            <CardFooter className="gap-3">
                <div className="flex gap-1 items-center">
                    <Button
                        isIconOnly
                        size="sm"
                        variant={item.userVote === 1 ? "solid" : "light"}
                        color={item.userVote === 1 ? "primary" : "default"}
                        onPress={() => handleVote('up')}
                        isDisabled={!session || isUpvoteDisabled(item.feedback.status)}
                    >
                        <ArrowUpIcon className="w-5 h-5" />
                    </Button>
                    <p className="font-semibold text-default-400 text-small">{item.voteCount}</p>
                    <Button
                        isIconOnly
                        size="sm"
                        variant={item.userVote === -1 ? "solid" : "light"}
                        color={item.userVote === -1 ? "danger" : "default"}
                        onPress={() => handleVote('down')}
                        isDisabled={!session || isUpvoteDisabled(item.feedback.status)}
                    >
                        <ArrowDownIcon className="w-5 h-5" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

// Main component to display the list of feedback items with filters and "Load More" button.
interface FeedbackListProps {
    initialData?: any;
    session: Session | null;
}

export function FeedbackList({ session }: FeedbackListProps) {
    const t = useTranslations("Feedback");

    // Filter state
    const [filters, setFilters] = useState<PublicFeedbackFilters>({
        type: [],
        status: [],
        searchTerm: "",
        sortBy: "votes",
        sortOrder: "desc",
        startDate: undefined,
        endDate: undefined,
    });

    // Debounce search term
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    // Prepare query parameters
    const queryFilters = useMemo(() => ({
        limit: 10,
        type: filters.type.length > 0 ? filters.type as (typeof feedbackTypeEnum.enumValues[number])[] : undefined,
        status: filters.status.length > 0 ? filters.status as (typeof feedbackStatusEnum.enumValues[number])[] : undefined,
        searchTerm: debouncedSearchTerm || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        startDate: filters.startDate,
        endDate: filters.endDate,
    }), [filters.type, filters.status, debouncedSearchTerm, filters.sortBy, filters.sortOrder, filters.startDate, filters.endDate]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = api.feedback.list.useInfiniteQuery(
        queryFilters,
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    const handleClearFilters = () => {
        setFilters({
            type: [],
            status: [],
            searchTerm: "",
            sortBy: "votes",
            sortOrder: "desc",
            startDate: undefined,
            endDate: undefined,
        });
    };

    const allItems = data?.pages.flatMap((page) => page.items) ?? [];

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <PublicFeedbackFilterBar
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={handleClearFilters}
            />

            {/* Feedback List */}
            <div className="space-y-4">
                {isLoading ? (
                    <FeedbackSkeleton count={6} />
                ) : allItems.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">{t("noFeedbackFound")}</p>
                    </div>
                ) : (
                    allItems.map((item) => (
                        <FeedbackCard key={item.feedback.id} item={item} session={session} queryFilters={queryFilters} />
                    ))
                )}

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
        </div>
    );
}
