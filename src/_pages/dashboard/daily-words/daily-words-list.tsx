"use client";

import React, { useState } from "react";
import {
    Button,
    Pagination,
    ModalContent,
    useDisclosure,
} from "@heroui/react";
import { api } from "@/src/trpc/react";
import { Edit, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import DailyWordsManagement from "./daily-words-management";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";

export default function DailyWordsList() {
    const [page, setPage] = useState(1);
    const limit = 10;
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedDailyWord, setSelectedDailyWord] = useState<{
        id?: number;
        wordId: number;
        date: string;
    } | null>(null);

    const { data, isLoading, refetch } = api.admin.dailyWords.getDailyWords.useQuery({
        limit,
        offset: (page - 1) * limit,
    });

    const deleteMutation = api.admin.dailyWords.deleteDailyWord.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this daily word?")) {
            deleteMutation.mutate({ id });
        }
    };

    const handleEdit = (dailyWord: any) => {
        setSelectedDailyWord({
            id: dailyWord.id,
            wordId: dailyWord.wordId,
            date: dailyWord.date,
        });
        onOpen();
    };

    const handleCreate = () => {
        setSelectedDailyWord(null);
        onOpen();
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Daily Words Management</h1>
                <Button color="primary" startContent={<Plus size={20} />} onPress={handleCreate}>
                    Add Daily Word
                </Button>
            </div>

            <CustomTable
                aria-label="Daily Words Table"
                columns={[
                    { key: "date", label: "DATE" },
                    { key: "wordName", label: "WORD" },
                    { key: "actions", label: "ACTIONS" },
                ]}
                items={data?.data ?? []}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={"No daily words found"}
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
                                        size="sm"
                                        variant="light"
                                        onPress={() => handleEdit(item)}
                                    >
                                        <Edit size={20} />
                                    </Button>
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
                            <Pagination
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
