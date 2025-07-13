"use client";

import { FC } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import {
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { AudioRecorder } from "@/src/components/customs/audio-recorder";
import { toast } from "sonner";
import { CustomModal } from "../customs/heroui/custom-modal";

interface RequestPronunciationModalProps {
    isOpen: boolean;
    onClose: () => void;
    searchTerm: string;
}

export const RequestPronunciationModal: FC<RequestPronunciationModalProps> = ({ isOpen, onClose, searchTerm }) => {
    const t = useTranslations("Pronunciation");
    const utils = api.useUtils()
    const { data, isLoading, isError } = api.search.getWordId.useQuery(
        { name: searchTerm },
        { enabled: isOpen, retry: 0 }
    );

    const handleUploadComplete = () => {
        toast.success(t("uploadComplete"));
        utils.request.getVotablePronunciationRequests.refetch({
            search: searchTerm,
        })
        onClose();
    };

    return (
        <CustomModal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader>{t("new.title")}</ModalHeader>
                <ModalBody className="flex items-center justify-center flex-wrap">
                    {isLoading && <Button color="primary">{t("loading")}</Button>}
                    {isError && <p className="text-danger">{t("new.wordNotFoundMessage")}</p>}
                    {data && data.wordId !== null && (
                        <AudioRecorder
                            wrapperClassName="w-full flex flex-wrap justify-center items-center"
                            wordId={data.wordId}
                            onUploadComplete={handleUploadComplete}
                        />
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" variant="light" onPress={onClose}>
                        {t("new.cancel")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </CustomModal>
    );
};
