"use client";
import { useTaskMenuLinks } from "@/src/components/task-pages/task-link";
import { useListState } from "@/src/hooks/use-list-state";
// src/_pages/dashboard/feedback/feedback-list.tsx


import { Key, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/src/i18n/routing";
import { User, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, DropdownSection } from "@heroui/react";
import { MoreVertical, Trash2Icon } from "lucide-react";

import { api } from "@/src/trpc/react";
import { feedbackStatusEnum, feedbackTypeEnum } from "@/db/schema/feedbacks";
import { DeleteFeedbackModal } from "./modals/delete-feedback";
import { formatDistanceToNow } from "date-fns";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { tr } from "date-fns/locale";
import { useDebounce } from "@/src/hooks/use-debounce";
import { FeedbackFilterBar, type FeedbackFilters } from "@/src/_pages/dashboard/feedback/feedback-filter-bar";
import { FeedbackTableSkeleton } from "@/src/_pages/feedback/table-skeleton";

type Feedback = {
    id: number;
    title: string;
    description: string;
    type: typeof feedbackTypeEnum.enumValues[number];
    status: typeof feedbackStatusEnum.enumValues[number];
    createdAt: Date;
    user: {
        id: string;
        name: string | null;
        image: string | null;
    } | null;
    voteCount: number;
};

export type FeedbackType = typeof feedbackTypeEnum.enumValues[number];
export type FeedbackStatus = typeof feedbackStatusEnum.enumValues[number];
export const statusColorMap: Record<typeof feedbackStatusEnum.enumValues[number], "success" | "danger" | "warning" | "primary" | "default"> = {
    open: "primary",
    in_progress: "warning",
    implemented: "success",
    testing: "warning",
    verified: "success",
    rejected: "danger",
    duplicate: "default",
    fixed: "success",
    wont_implement: "default",
    closed: "danger",
};

export function FeedbackList() {
    const taskMenuLink = useTaskMenuLinks();
    const locale = useLocale()
    const t = useTranslations("Dashboard.feedback");
    const searchParams = useSearchParams();
    const requestedId = Number(searchParams.get("feedbackId"));
    const feedbackId = Number.isInteger(requestedId) && requestedId > 0 && requestedId <= 2147483647 ? requestedId : undefined;

    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const [list, setList] = useListState({ page: 1, size: 20, filters: { types: [] as string[], statuses: [] as string[], searchTerm: "", sortBy: "votes" as "votes" | "createdAt", sortOrder: "desc" as "asc" | "desc", startDate: null as string | null, endDate: null as string | null } });
    const page = list.page; const itemsPerPage = list.size;
    const setPage = (page: number) => setList(old => ({ ...old, page }));
    const filters: FeedbackFilters = { ...list.filters, startDate: list.filters.startDate ? new Date(list.filters.startDate) : null, endDate: list.filters.endDate ? new Date(list.filters.endDate) : null };
    const setFilters = (value: FeedbackFilters) => setList(old => ({ ...old, page: 1, filters: { ...value, startDate: value.startDate?.toISOString() ?? null, endDate: value.endDate?.toISOString() ?? null } }));
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const { data, isLoading } = api.admin.feedback.getAll.useQuery({
        feedbackId,
        page: feedbackId ? 1 : page,
        limit: itemsPerPage,
        type: !feedbackId && filters.types.length > 0 ? filters.types as (typeof feedbackTypeEnum.enumValues[number])[] : undefined,
        status: !feedbackId && filters.statuses.length > 0 ? filters.statuses as (typeof feedbackStatusEnum.enumValues[number])[] : undefined,
        excludeStatuses: feedbackId ? [] : undefined,
        searchTerm: feedbackId ? undefined : debouncedSearchTerm,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        startDate: feedbackId ? undefined : filters.startDate ?? undefined,
        endDate: feedbackId ? undefined : filters.endDate ?? undefined,
    });

    const handleFiltersChange = (newFilters: FeedbackFilters) => {
        setFilters(newFilters);
    };

    const handleClearFilters = () => {
        setFilters({
            types: [],
            statuses: [],
            searchTerm: "",
            sortBy: "votes",
            sortOrder: "desc",
            startDate: null,
            endDate: null,
        });
    };

    const openDeleteModal = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setDeleteModalOpen(true);
    };

    const columns = [
        { key: "user", label: t("table.user") },
        { key: "title", label: t("table.title") },
        { key: "type", label: t("table.type") },
        { key: "status", label: t("table.status") },
        { key: "votes", label: t("table.votes") },
        { key: "created_at", label: t("table.created_at") },
        { key: "actions", label: t("table.actions") },
    ];

    const renderCell = useCallback((item: object, columnKey: Key): React.ReactNode => {
        const feedbackItem = item as Feedback;
        switch (columnKey) {
            case "user":
                return feedbackItem.user ? (
                    <User
                        name={feedbackItem.user.name}
                        description={feedbackItem.user.id.substring(0, 10)}
                        avatarProps={{
                            src: feedbackItem.user.image ?? undefined,
                        }}
                    />
                ) : t("anonymous_user");
            case "title":
                return feedbackItem.title;
            case "type":
                return (
                    <Chip radius="md" size="sm" variant="flat">
                        {t(`types.${feedbackItem.type}`)}
                    </Chip>
                );
            case "status":
                return (
                    <Chip radius="md" color={statusColorMap[feedbackItem.status]} size="sm" variant="flat">
                        {t(`statuses.${feedbackItem.status}`)}
                    </Chip>
                );
            case "votes":
                return feedbackItem.voteCount;
            case "created_at":
                return formatDistanceToNow(feedbackItem.createdAt, {
                    addSuffix: true,
                    locale: locale === 'tr' ? tr : undefined
                });
            case "actions":
                return (
                    <div className="relative flex justify-end items-center gap-2">
                        <Dropdown>
                            <DropdownTrigger>
                                <Button isIconOnly size="sm" variant="light">
                                    <MoreVertical className="text-default-300" />
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu onAction={(key) => {
                                switch (key) {


                                    case "delete":
                                        setSelectedFeedback(feedbackItem);
                                        setDeleteModalOpen(true);
                                        break;
                                }
                            }}>

                                <DropdownSection aria-label={t("actions.title")}>
                                    <DropdownItem key="edit" textValue={t("actions.edit_status")} {...taskMenuLink({ pathname: "/dashboard/feedback/[id]/edit", params: { id: feedbackItem.id } })}> {t("actions.edit_status")} / {t("actions.edit_type")}</DropdownItem>

                                    <DropdownItem
                                        key="delete"
                                        className="text-danger"
                                        color="danger"
                                        startContent={<Trash2Icon size={18} />}
                                        onPress={() => openDeleteModal(feedbackItem)}
                                    >
                                        {t("actions.delete")}
                                    </DropdownItem>
                                </DropdownSection>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return null;
        }
    }, [t, locale, taskMenuLink]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
            {feedbackId ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3">
                    <p className="text-sm">{t("selectedFeedback", { id: feedbackId })}</p>
                    <Link href="/dashboard/feedback" className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{t("showAllFeedback")}</Link>
                </div>
            ) : <FeedbackFilterBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
            />}
            {isLoading ? (
                <FeedbackTableSkeleton rowCount={10} />
            ) : (
                <CustomTable
                    emptyContent={t("table.empty")}
                    aria-label={t("title")}
                    columns={columns}
                    items={data?.feedbacks ?? []}
                    renderCell={renderCell}
                    bottomContent={feedbackId ? undefined :
                        <div className="flex w-full justify-center">
                            <CustomPagination
                                page={page}
                                total={data?.totalPages ?? 1}
                                onChange={(p) => setPage(p)}
                            />
                        </div>
                    }
                />
            )}
            {selectedFeedback && (
                <>


                    <DeleteFeedbackModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setDeleteModalOpen(false)}
                        feedback={selectedFeedback}
                    />
                </>
            )}
        </div>
    );
}
