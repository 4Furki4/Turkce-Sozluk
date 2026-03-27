"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";

interface DeleteAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: { id: number; slug: string } | null;
}

export default function DeleteAnnouncementModal({
  isOpen,
  onClose,
  announcement,
}: DeleteAnnouncementModalProps) {
  const t = useTranslations("Dashboard.Announcements");
  const router = useRouter();
  
  const { mutate: deleteAnnouncement, isPending } = api.admin.announcements.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      onClose();
      router.refresh();
    },
    onError: (error) => {
      toast.error(t("deleteError", { error: error.message }));
    },
  });

  const handleDelete = () => {
    if (announcement) {
      deleteAnnouncement({ id: announcement.id });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{t("deleteModalTitle")}</ModalHeader>
        <ModalBody>
          {announcement ? (
            <p>
              {t("deleteConfirmation", { slug: announcement.slug })}
            </p>
          ) : (
            <p>{t("deleteGenericConfirmation")}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={onClose}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            color="danger"
            onPress={handleDelete}
            isLoading={isPending}
          >
            {t("delete")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
