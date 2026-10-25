"use client";

import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import React from "react";
import { useListPage } from "@/src/hooks/use-list-page";
import { TaskButton } from "@/src/components/task-pages/task-link";
import { Button } from "@heroui/react";
import { api } from "@/src/trpc/react";
import { Edit, Trash2, Plus } from "lucide-react";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { useTranslations } from "next-intl";

export default function MisspellingsList({ correctionId }: { correctionId?: number }) {
    const t = useTranslations("Dashboard.Misspellings");
    const [page, setPage] = useListPage();
    const limit = 10;
    const { data, isLoading, refetch } = api.admin.misspellings.getMisspellings.useQuery({
        limit,
        offset: (page - 1) * limit,
        id: correctionId,
    });

    const deleteMutation = api.admin.misspellings.deleteMisspelling.useMutation({
        onSuccess: () => {
            if (data?.data.length === 1 && page > 1) setPage(page - 1);
            refetch();
        },
    });

    const handleDelete = (id: number) => {
        if (confirm(t("toasts.deleteConfirm"))) {
            deleteMutation.mutate({ id });
        }
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;
    React.useEffect(() => { if (data && page > Math.max(totalPages, 1)) setPage(Math.max(totalPages, 1)); }, [data, page, totalPages]);

    return (
        <div className="p-6">
            <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
                <TaskButton color="primary" startContent={<Plus size={20} />} href="/dashboard/misspellings/new">
                    {t("addMisspelling")}
                </TaskButton>
            </div>

            <CustomTable
                aria-label={t("pageTitle")}
                columns={[
                    { key: "incorrectSpelling", label: t("columns.incorrectSpelling") },
                    { key: "correctWordName", label: t("columns.correctWord") },
                    { key: "actions", label: t("columns.actions") },
                ]}
                items={data?.data ?? []}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={t("emptyContent")}
                renderCell={(item, columnKey) => {
                    switch (columnKey) {
                        case "incorrectSpelling":
                            return item.incorrectSpelling;
                        case "correctWordName":
                            return item.correctWordName;
                        case "actions":
                            return (
                                <div className="flex gap-2">
                                    <TaskButton
                                        isIconOnly
                                        size="sm"
                                        variant="light"
                                        href={{ pathname: "/dashboard/misspellings/[id]/edit", params: { id: item.id } }}
                                    >
                                        <Edit size={20} />
                                    </TaskButton>
                                    <Button
                                        isIconOnly
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
