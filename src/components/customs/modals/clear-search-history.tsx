import React from 'react'
import { Modal, ModalBody, ModalContent, Button, ModalHeader, ModalFooter } from '@heroui/react'
import { useTranslations } from 'next-intl';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { cn } from '@/lib/utils';

export default function ClearSearchHistory({
    isOpen,
    onClose,
    onClear
}: {
    isOpen: boolean;
    onClose: () => void;
    onClear: () => void;
}) {
    const t = useTranslations("SearchHistory");
    const { isBlurEnabled } = useSnapshot(preferencesState);
    return (
        <Modal motionProps={{
            variants: {
                enter: {
                    opacity: 1,
                    transition: {
                        duration: 0.1,
                        ease: 'easeInOut',
                    }
                },
                exit: {
                    opacity: 0,
                    transition: {
                        duration: 0.1,
                        ease: 'easeInOut',
                    }
                },
            }
        }} classNames={{
            base: cn(
                "bg-background border-2 border-border rounded-md p-2 w-full",
                { "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none": isBlurEnabled }
            )
        }} isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>
                            {t("clearSearchHistoryTitle")}
                        </ModalHeader>
                        <ModalBody>
                            <p>{t("clearSearchHistoryDescription")}</p>
                        </ModalBody>
                        <ModalFooter>
                            <Button onPress={onClose} variant="flat">{t("cancel")}</Button>
                            <Button onPress={onClear} variant="solid" color="danger">{t("clear")}</Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}
