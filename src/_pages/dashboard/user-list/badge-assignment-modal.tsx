"use client";

import { api } from "@/src/trpc/react";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
} from "@heroui/react";
import { useState } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";

interface BadgeAssignmentModalProps {
    isOpen: boolean;
    onOpenChange: () => void;
    userId: string;
    userName: string;
}

export default function BadgeAssignmentModal({
    isOpen,
    onOpenChange,
    userId,
    userName,
}: BadgeAssignmentModalProps) {
    const [selectedBadgeSlug, setSelectedBadgeSlug] = useState<string>("");
    const utils = api.useUtils();

    const { data: badges } = api.badge.getAll.useQuery();

    const assignMutation = api.badge.assign.useMutation({
        onSuccess: () => {
            toast.success("Badge assigned successfully");
            utils.user.getPublicProfileData.invalidate({ userId });
            onOpenChange();
            setSelectedBadgeSlug("");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleAssign = () => {
        if (!selectedBadgeSlug) return;
        assignMutation.mutate({
            userId,
            badgeSlug: selectedBadgeSlug,
        });
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Assign Badge to {userName}
                        </ModalHeader>
                        <ModalBody>
                            <Select
                                label="Select Badge"
                                placeholder="Choose a badge"
                                selectedKeys={selectedBadgeSlug ? [selectedBadgeSlug] : []}
                                onChange={(e) => setSelectedBadgeSlug(e.target.value)}
                                startContent={<Award className="w-4 h-4" />}
                            >
                                {(badges || []).map((badge) => (
                                    <SelectItem key={badge.slug} textValue={badge.nameEn}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{badge.icon}</span>
                                            <div className="flex flex-col">
                                                <span>{badge.nameEn}</span>
                                                <span className="text-tiny text-default-400">{badge.nameTr}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                onPress={handleAssign}
                                isLoading={assignMutation.isPending}
                                isDisabled={!selectedBadgeSlug}
                            >
                                Assign
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
