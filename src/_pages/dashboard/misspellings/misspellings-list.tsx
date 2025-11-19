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
import MisspellingsManagement from "./misspellings-management";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";

export default function MisspellingsList() {
    const [page, setPage] = useState(1);
    const limit = 10;
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedItem, setSelectedItem] = useState<{
        id?: number;
        correctWordId: number;
        incorrectSpelling: string;
    } | null>(null);

    const { data, isLoading, refetch } = api.admin.misspellings.getMisspellings.useQuery({
        limit,
        offset: (page - 1) * limit,
    });

    const deleteMutation = api.admin.misspellings.deleteMisspelling.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleDelete = (id: number) => {
        if (confirm("Are you sure you want to delete this misspelling?")) {
            deleteMutation.mutate({ id });
        }
    };

    const handleEdit = (item: any) => {
        setSelectedItem({
            id: item.id,
            correctWordId: item.correctWordId,
            incorrectSpelling: item.incorrectSpelling,
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
                <h1 className="text-2xl font-bold">Misspellings Management</h1>
                <Button color="primary" startContent={<Plus size={20} />} onPress={handleCreate}>
                    Add Misspelling
                </Button>
            </div>

            <CustomTable
                aria-label="Misspellings Table"
                columns={[
                    { key: "incorrectSpelling", label: "INCORRECT SPELLING" },
                    { key: "correctWordName", label: "CORRECT WORD" },
                    { key: "actions", label: "ACTIONS" },
                ]}
                items={data?.data ?? []}
                loadingState={isLoading ? "loading" : "idle"}
                emptyContent={"No misspellings found"}
                renderCell={(item, columnKey) => {
                    switch (columnKey) {
                        case "incorrectSpelling":
                            return item.incorrectSpelling;
                        case "correctWordName":
                            return item.correctWordName;
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
                        <MisspellingsManagement
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
