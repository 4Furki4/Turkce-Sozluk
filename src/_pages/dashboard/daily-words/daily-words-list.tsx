"use client";

import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import React from "react";
import { useListPage } from "@/src/hooks/use-list-page";
import { TaskButton } from "@/src/components/task-pages/task-link";
import { Button } from "@heroui/react";
import { api } from "@/src/trpc/react";
import { Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function DailyWordsList() {
    const t = useTranslations("Dashboard.DailyWords");
    const [page, setPage] = useListPage();
    const limit = 10;
    const { data, isLoading, refetch } = api.admin.dailyWords.getDailyWords.useQuery({
        limit,
        offset: (page - 1) * limit,
    });

    const deleteMutation = api.admin.dailyWords.deleteDailyWord.useMutation({
        onSuccess: () => {
            if (data?.data.length === 1 && page > 1) setPage(page - 1);
            refetch();
        },
        onError: () => toast.error(t("deleteFailed")),
    });

    const handleDelete = (id: number) => {
        if (confirm(t("confirmDelete"))) {
            deleteMutation.mutate({ id });
        }
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;
    React.useEffect(() => { if (data && page > Math.max(totalPages, 1)) setPage(Math.max(totalPages, 1)); }, [data, page, totalPages]);

    return (
        <div className="p-3 sm:p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <TaskButton color="primary" startContent={<Plus size={20} />} href="/dashboard/daily-words/new">
                    {t("add")}
                </TaskButton>
            </div>

            <CustomTable
                aria-label={t("table")}
                columns={[
                    { key: "date", label: t("date") },
                    { key: "wordName", label: t("word") },
                    { key: "actions", label: t("actions") },
                ]}
                items={data?.data ?? []}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={t("empty")}
                renderCell={(item, columnKey) => {
                    switch (columnKey) {
                        case "date":
                            return format(new Date(item.date), "yyyy-MM-dd");
                        case "wordName":
                            return item.wordName;
                        case "actions":
                            return (
                                <div className="flex gap-2">
                                    <TaskButton
                                        isIconOnly
                                        aria-label={t("editWord", { word: item.wordName })}
                                        className="h-11 min-w-11"
                                        size="sm"
                                        variant="light"
                                        href={{ pathname: "/dashboard/daily-words/[id]/edit", params: { id: item.id } }}
                                    >
                                        <Edit size={20} />
                                    </TaskButton>
                                    <Button
                                        isIconOnly
                                        aria-label={t("deleteWord", { word: item.wordName })}
                                        className="h-11 min-w-11"
                                        size="sm"
                                        color="danger"
                                        variant="light"
                                        onPress={() => handleDelete(item.id)}
                                    >
                                        <Trash2 size={20} />
                                    </Button>
                                </div>
                            );
                        default:
                            return null;
                    }
                }}
                bottomContent={
                    totalPages > 0 ? (
                        <div className="flex w-full justify-center">
                            <CustomPagination
                                isCompact
                                showControls
                                showShadow
                                color="primary"
                                page={page}
                                total={totalPages}
                                onChange={(page) => setPage(page)}
                            />
                        </div>
                    ) : null
                }
            />

        </div>
    );
}
