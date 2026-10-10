"use client";

import React from "react";
import {
    Modal,
    type ModalProps,
} from "@heroui/react";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const LocalizedCloseButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    function LocalizedCloseButton(props, ref) {
        const t = useTranslations("SharedUI");
        return <button {...props} ref={ref} aria-label={t("Close")}><X aria-hidden size={20} /></button>;
    },
);

// We extend the base ModalProps to accept children directly.
export interface CustomModalProps extends ModalProps { }

export function CustomModal({
    children,
    classNames,
    motionProps,
    closeButton,
    ...props
}: CustomModalProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);

    return (
        <Modal
            placement="center"
            scrollBehavior="inside"
            size="lg"
            // Pass all props like isOpen, onOpenChange, size, etc., directly.
            {...props}
            closeButton={closeButton ?? <LocalizedCloseButton />}
            // Define the default animations and styles here.
            motionProps={motionProps ?? {
                variants: {
                    enter: {
                        opacity: 1,
                        transition: {
                            duration: 0.15,
                            ease: "easeOut",
                        },
                    },
                    exit: {
                        opacity: 0,
                        transition: {
                            duration: 0.1,
                            ease: "easeIn",
                        },
                    },
                },
            }}
            classNames={{
                ...classNames,
                closeButton: cn("z-50 h-11 w-11", classNames?.closeButton),
                // Merge the default styles with any overrides passed via props.
                header: cn("min-w-0 pr-12", classNames?.header),
                body: cn("min-w-0", classNames?.body),
                footer: cn("flex-wrap", classNames?.footer),
                backdrop: cn("bg-black/50", classNames?.backdrop),
                base: cn(
                    "min-w-0 [overflow-wrap:anywhere] bg-background border-2 border-border rounded-md",
                    {
                        "bg-background/70 shadow-medium backdrop-blur-md backdrop-saturate-150":
                            isBlurEnabled,
                    },
                    classNames?.base
                ),
            }}
        >
            {/* Pass the children (e.g., <ModalContent>) directly through. */}
            {children}
        </Modal>
    );
}
