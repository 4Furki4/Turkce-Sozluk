"use client";

import { Modal, ModalContent, ModalBody, ModalHeader } from "@heroui/react";
import SearchContainer from "./search-container";

interface MobileSearchDrawerProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    SearchIntl: string;
}

export default function MobileSearchDrawer({
    isOpen,
    onOpenChange,
    SearchIntl
}: MobileSearchDrawerProps) {
    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            placement="bottom"
            size="full"
            classNames={{
                base: "h-[85vh] rounded-t-3xl",
                header: "border-b border-white/10",
                body: "p-4"
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            duration: 0.3,
                            ease: "easeOut",
                        },
                    },
                    exit: {
                        y: 100,
                        opacity: 0,
                        transition: {
                            duration: 0.2,
                            ease: "easeIn",
                        },
                    },
                }
            }}
            scrollBehavior="inside"
            backdrop="blur"
        >
            <ModalContent className="bg-background/95 backdrop-blur-xl">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 text-center items-center justify-center pt-6 pb-4">
                            {SearchIntl}
                            <div className="w-12 h-1 bg-zinc-700/50 rounded-full mt-2" />
                        </ModalHeader>
                        <ModalBody className="pt-6">
                            <SearchContainer
                                autoFocus
                                onSearchComplete={onClose}
                                inputWrapperClassName="bg-secondary/50 border-secondary focus-within:bg-background focus-within:border-primary"
                            />
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
