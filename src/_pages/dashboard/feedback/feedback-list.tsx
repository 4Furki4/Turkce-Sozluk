// src/_pages/dashboard/feedback/feedback-list.tsx
"use client";

import { Key, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { User, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, DropdownSection } from "@heroui/react";
import { EditIcon, MoreVertical, Trash2Icon, PencilRuler } from "lucide-react";

import { api } from "@/src/trpc/react";
import { feedbackStatusEnum, feedbackTypeEnum } from "@/db/schema/feedbacks";
import { UpdateStatusModal } from "./modals/update-status-feedback";
import { DeleteFeedbackModal } from "./modals/delete-feedback";
import { formatDistanceToNow } from "date-fns";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { tr } from "date-fns/locale";
import { useDebounce } from "@/src/hooks/use-debounce";
import { UpdateTypeModal } from "./modals/update-type";
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
    const locale = useLocale()
    const t = useTranslations("Dashboard.feedback");

    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
    const [isUpdateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
    const [isUpdateTypeModalOpen, setUpdateTypeModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    // Initialize filters with default values
    const [filters, setFilters] = useState<FeedbackFilters>({
        types: [],
        statuses: [],
        searchTerm: "",
        sortBy: "votes",
        sortOrder: "desc",
        startDate: null,
        endDate: null,
    });

    const debouncedSearchTerm = useDebounce(filters.searchTerm, 500);

    const { data, isLoading } = api.admin.feedback.getAll.useQuery({
        page,
        limit: itemsPerPage,
        type: filters.types.length > 0 ? filters.types as (typeof feedbackTypeEnum.enumValues[number])[] : undefined,
        status: filters.statuses.length > 0 ? filters.statuses as (typeof feedbackStatusEnum.enumValues[number])[] : undefined,
        searchTerm: debouncedSearchTerm,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        startDate: filters.startDate ?? undefined,
        endDate: filters.endDate ?? undefined,
    });

    const handleFiltersChange = (newFilters: FeedbackFilters) => {
        setFilters(newFilters);
        setPage(1); // Reset to first page when filters change
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
        setPage(1);
    };

    const openUpdateStatusModal = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setUpdateStatusModalOpen(true);
    };

    const openUpdateTypeModal = (feedback: Feedback) => {
        setSelectedFeedback(feedback);
        setUpdateTypeModalOpen(true);
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
                                    case "edit_status":
                                        setSelectedFeedback(feedbackItem);
                                        setUpdateStatusModalOpen(true);
                                        break;
                                    case "edit_type":
                                        setSelectedFeedback(feedbackItem);
                                        setUpdateTypeModalOpen(true);
                                        break;
                                    case "delete":
                                        setSelectedFeedback(feedbackItem);
                                        setDeleteModalOpen(true);
                                        break;
                                }
                            }}>

                                <DropdownSection aria-label={t("actions.title")}>
                                    <DropdownItem
                                        key="edit_status"
                                        startContent={<EditIcon className="text-default-500" size={18} />}
                                        onPress={() => openUpdateStatusModal(feedbackItem)}
                                    >
                                        {t("actions.edit_status")}
                                    </DropdownItem>
                                    <DropdownItem
                                        key="edit_type"
                                        startContent={<PencilRuler className="text-default-500" size={18} />}
                                        onPress={() => openUpdateTypeModal(feedbackItem)}
                                    >
                                        {t("actions.edit_type")}
                                    </DropdownItem>
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
    }, [t, locale]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
            <FeedbackFilterBar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
            />
            {isLoading ? (
                <FeedbackTableSkeleton rowCount={10} />
            ) : (
                <CustomTable
                    emptyContent={t("table.empty")}
                    aria-label={t("title")}
                    columns={columns}
                    items={data?.feedbacks ?? []}
                    renderCell={renderCell}
                    bottomContent={
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
                    <UpdateStatusModal
                        isOpen={isUpdateStatusModalOpen}
                        onClose={() => setUpdateStatusModalOpen(false)}
                        feedback={selectedFeedback}
                    />
                    <UpdateTypeModal
                        isOpen={isUpdateTypeModalOpen}
                        onClose={() => setUpdateTypeModalOpen(false)}
                        feedback={selectedFeedback}
                    />
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
