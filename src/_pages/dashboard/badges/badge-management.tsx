"use client";

import { TaskButton } from "@/src/components/task-pages/task-link";
import { api } from "@/src/trpc/react";
import {
    Button,
    CardBody,
    CardHeader,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure,
    Tooltip,
} from "@heroui/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CustomModal } from "@/src/components/customs/heroui/custom-modal";

type BadgeFormData = {
    slug: string;
    nameTr: string;
    nameEn: string;
    descriptionTr: string;
    descriptionEn: string;
    icon: string;
    requirementType: "min_points" | "count_word" | "count_pronunciation" | "count_meaning";
    requirementValue: number;
    category: "general" | "specialist";
};

export default function BadgeManagement() {
    const [selectedBadge, setSelectedBadge] = useState<BadgeFormData | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [badgeToDelete, setBadgeToDelete] = useState<string | null>(null);

    const { register, handleSubmit, reset, setValue, watch } = useForm<BadgeFormData>();
    const utils = api.useUtils();

    const { data: badges, isLoading } = api.badge.getAll.useQuery();

    const deleteMutation = api.badge.delete.useMutation({
        onSuccess: () => {
            toast.success("Badge deleted successfully");
            utils.badge.getAll.invalidate();
            onDeleteClose();
            setBadgeToDelete(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleDelete = (slug: string) => {
        setBadgeToDelete(slug);
        onDeleteOpen();
    };

    const columns = [
        { key: "icon", label: "ICON" },
        { key: "slug", label: "SLUG" },
        { key: "nameTr", label: "NAME (TR)" },
        { key: "nameEn", label: "NAME (EN)" },
        { key: "requirement", label: "REQUIREMENT" },
        { key: "category", label: "CATEGORY" },
        { key: "actions", label: "ACTIONS" },
    ];

    const renderCell = (badge: any, columnKey: React.Key) => {
        switch (columnKey) {
            case "icon":
                return <span className="text-2xl">{badge.icon}</span>;
            case "slug":
                return badge.slug;
            case "nameTr":
                return (
                    <div className="flex flex-col">
                        <span className="font-bold">{badge.nameTr}</span>
                        <span className="text-xs text-gray-500">{badge.descriptionTr}</span>
                    </div>
                );
            case "nameEn":
                return (
                    <div className="flex flex-col">
                        <span className="font-bold">{badge.nameEn}</span>
                        <span className="text-xs text-gray-500">{badge.descriptionEn}</span>
                    </div>
                );
            case "requirement":
                return `${badge.requirementType} (${badge.requirementValue})`;
            case "category":
                return badge.category;
            case "actions":
                return (
                    <div className="flex gap-2">
                        <Tooltip content="Edit">
                            <TaskButton isIconOnly variant="light" aria-label="Edit" href={{ pathname: "/dashboard/badges/[slug]/edit", params: { slug: badge.slug } }}><Pencil size={16} /></TaskButton>
                        </Tooltip>
                        <Tooltip color="danger" content="Delete">
                            <span className="text-lg text-danger cursor-pointer active:opacity-50" onClick={() => handleDelete(badge.slug)}>
                                <Trash2 size={16} />
                            </span>
                        </Tooltip>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto p-6">
            <CustomCard>
                <CardHeader className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Badge Management</h1>
                    <TaskButton color="primary" startContent={<Plus size={16} />} href="/dashboard/badges/new">
                        Add New Badge
                    </TaskButton>
                </CardHeader>
                <CardBody>
                    <CustomTable
                        columns={columns}
                        items={(badges || []).map((b) => ({ ...b, key: b.slug }))}
                        renderCell={renderCell}
                        loadingState={isLoading ? "loading" : "idle"}
                        emptyContent="No badges found"
                    />
                </CardBody>
            </CustomCard>

            {/* Delete Confirmation Modal */}
            <CustomModal isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <ModalContent>
                    <ModalHeader>Confirm Delete</ModalHeader>
                    <ModalBody>
                        Are you sure you want to delete this badge? This action cannot be undone.
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={onDeleteClose}>
                            Cancel
                        </Button>
                        <Button
                            color="danger"
                            onPress={() => badgeToDelete && deleteMutation.mutate({ slug: badgeToDelete })}
                            isLoading={deleteMutation.isPending}
                        >
                            Delete
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </CustomModal>
        </div >
    );
}
