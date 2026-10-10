"use client";

import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import React, { useState } from "react";
import {
    Button,
    ModalContent,
    useDisclosure,
} from "@heroui/react";
import { api } from "@/src/trpc/react";
import { Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import DailyWordsManagement from "./daily-words-management";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function DailyWordsList() {
    const t = useTranslations("Dashboard.DailyWords");
    const [page, setPage] = useState(1);
    const limit = 10;
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedDailyWord, setSelectedDailyWord] = useState<{
        id?: number;
        wordId: number;
        date: string;
        wordName?: string;
    } | null>(null);

    const { data, isLoading, refetch } = api.admin.dailyWords.getDailyWords.useQuery({
        limit,
        offset: (page - 1) * limit,
    });

    const deleteMutation = api.admin.dailyWords.deleteDailyWord.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: () => toast.error(t("deleteFailed")),
    });

    const handleDelete = (id: number) => {
        if (confirm(t("confirmDelete"))) {
            deleteMutation.mutate({ id });
        }
    };

    const handleEdit = (dailyWord: any) => {
        setSelectedDailyWord({
            id: dailyWord.id,
            wordId: dailyWord.wordId,
            date: dailyWord.date,
            wordName: dailyWord.wordName,
        });
        onOpen();
    };

    const handleCreate = () => {
        setSelectedDailyWord(null);
        onOpen();
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;

    return (
        <div className="p-3 sm:p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <Button color="primary" startContent={<Plus size={20} />} onPress={handleCreate}>
                    {t("add")}
                </Button>
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
                                    <Button
                                        isIconOnly
                                        aria-label={t("editWord", { word: item.wordName })}
                                        className="h-11 min-w-11"
                                        size="sm"
                                        variant="light"
                                        onPress={() => handleEdit(item)}
                                    >
                                        <Edit size={20} />
                                    </Button>
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

            <CustomModal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
                <ModalContent>
                    {(onClose) => (
                        <DailyWordsManagement
                            onClose={() => {
                                onClose();
                                refetch();
                            }}
                            initialData={selectedDailyWord}
                        />
                    )}
                </ModalContent>
            </CustomModal>
        </div>
    );
}
