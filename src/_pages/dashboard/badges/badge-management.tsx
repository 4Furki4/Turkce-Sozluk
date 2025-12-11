"use client";

import { api } from "@/src/trpc/react";
import {
    Button,
    CardBody,
    CardHeader,
    Input,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Textarea,
    useDisclosure,
    Tooltip,
} from "@heroui/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { badgeRequirementTypeEnum, badgeCategoryEnum } from "@/db/schema/gamification";
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

    const createMutation = api.badge.create.useMutation({
        onSuccess: () => {
            toast.success("Badge created successfully");
            utils.badge.getAll.invalidate();
            onClose();
            reset();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.badge.update.useMutation({
        onSuccess: () => {
            toast.success("Badge updated successfully");
            utils.badge.getAll.invalidate();
            onClose();
            reset();
            setSelectedBadge(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

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

    const onSubmit = (data: BadgeFormData) => {
        if (selectedBadge) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (badge: any) => {
        setSelectedBadge(badge);
        setValue("slug", badge.slug);
        setValue("nameTr", badge.nameTr);
        setValue("nameEn", badge.nameEn);
        setValue("descriptionTr", badge.descriptionTr);
        setValue("descriptionEn", badge.descriptionEn);
        setValue("icon", badge.icon);
        setValue("requirementType", badge.requirementType);
        setValue("requirementValue", badge.requirementValue);
        setValue("category", badge.category);
        onOpen();
    };

    const handleDelete = (slug: string) => {
        setBadgeToDelete(slug);
        onDeleteOpen();
    };

    const handleAddNew = () => {
        setSelectedBadge(null);
        reset();
        onOpen();
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
                            <span className="text-lg text-default-400 cursor-pointer active:opacity-50" onClick={() => handleEdit(badge)}>
                                <Pencil size={16} />
                            </span>
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
                    <Button color="primary" startContent={<Plus size={16} />} onPress={handleAddNew}>
                        Add New Badge
                    </Button>
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

            {/* Create/Edit Modal */}
            <CustomModal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
                <ModalContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <ModalHeader>{selectedBadge ? "Edit Badge" : "Create New Badge"}</ModalHeader>
                        <ModalBody className="gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Slug"
                                    placeholder="unique-slug"
                                    {...register("slug", { required: true })}
                                    isDisabled={!!selectedBadge}
                                />
                                <Input
                                    label="Icon (Emoji)"
                                    placeholder="🏆"
                                    {...register("icon", { required: true })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Name (TR)"
                                    placeholder="Rozet Adı"
                                    {...register("nameTr", { required: true })}
                                />
                                <Input
                                    label="Name (EN)"
                                    placeholder="Badge Name"
                                    {...register("nameEn", { required: true })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Textarea
                                    label="Description (TR)"
                                    placeholder="Açıklama"
                                    {...register("descriptionTr", { required: true })}
                                />
                                <Textarea
                                    label="Description (EN)"
                                    placeholder="Description"
                                    {...register("descriptionEn", { required: true })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Requirement Type"
                                    {...register("requirementType", { required: true })}
                                    defaultSelectedKeys={selectedBadge ? [selectedBadge.requirementType] : []}
                                >
                                    {badgeRequirementTypeEnum.enumValues.map((type) => (
                                        <SelectItem key={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Input
                                    type="number"
                                    label="Requirement Value"
                                    placeholder="10"
                                    {...register("requirementValue", { required: true, valueAsNumber: true })}
                                />
                            </div>

                            <Select
                                label="Category"
                                {...register("category", { required: true })}
                                defaultSelectedKeys={selectedBadge ? [selectedBadge.category] : []}
                            >
                                {badgeCategoryEnum.enumValues.map((cat) => (
                                    <SelectItem key={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </Select>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                                {selectedBadge ? "Update" : "Create"}
                            </Button>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </CustomModal>

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
