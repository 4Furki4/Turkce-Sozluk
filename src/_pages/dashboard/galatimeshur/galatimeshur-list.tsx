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
import GalatiMeshurManagement from "./galatimeshur-management";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";

export default function GalatiMeshurList() {
    const [page, setPage] = useState(1);
    const limit = 10;
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedItem, setSelectedItem] = useState<{
        id?: number;
        wordId: number;
        explanation: string;
        correctUsage: string;
    } | null>(null);

    const { data, isLoading, refetch } = api.admin.galatiMeshur.getGalatiMeshur.useQuery({
        limit,
        offset: (page - 1) * limit,
    });

    const deleteMutation = api.admin.galatiMeshur.deleteGalatiMeshur.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this entry?")) {
            deleteMutation.mutate({ id });
        }
    };

    const handleEdit = (item: any) => {
        setSelectedItem({
            id: item.id,
            wordId: item.wordId,
            explanation: item.explanation,
            correctUsage: item.correctUsage,
        });
        onOpen();
    };

    const handleCreate = () => {
        setSelectedItem(null);
        onOpen();
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Galatımeşhur Management</h1>
                <Button color="primary" startContent={<Plus size={20} />} onPress={handleCreate}>
                    Add Entry
                </Button>
            </div>

            <CustomTable
                aria-label="Galatımeşhur Table"
                columns={[
                    { key: "wordName", label: "WORD" },
                    { key: "explanation", label: "EXPLANATION" },
                    { key: "correctUsage", label: "CORRECT USAGE" },
                    { key: "actions", label: "ACTIONS" },
                ]}
                items={data?.data ?? []}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={"No entries found"}
                renderCell={(item, columnKey) => {
                    switch (columnKey) {
                        case "wordName":
                            return item.wordName;
                        case "explanation":
                            return <div className="max-w-xs truncate">{item.explanation}</div>;
                        case "correctUsage":
                            return <div className="max-w-xs truncate">{item.correctUsage}</div>;
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
                        <GalatiMeshurManagement
                            onClose={() => {
                                onClose();
                                refetch();
                            }}
                            initialData={selectedItem}
                        />
                    )}
                </ModalContent>
            </CustomModal>
        </div>
    );
}
