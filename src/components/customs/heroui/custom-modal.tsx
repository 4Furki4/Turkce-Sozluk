"use client";

import React from "react";
import {
    Modal,
    type ModalProps,
} from "@heroui/react";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { cn } from "@/lib/utils";

// We extend the base ModalProps to accept children directly.
export interface CustomModalProps extends ModalProps { }

export function CustomModal({
    children,
    classNames,
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
            // Define the default animations and styles here.
            motionProps={{
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
                // Merge the default styles with any overrides passed via props.
                backdrop: cn("bg-black/50", classNames?.backdrop),
                base: cn(
                    "bg-background border-2 border-border rounded-md",
                    {
                        "bg-background/70 shadow-medium backdrop-blur-md backdrop-saturate-150":
                            isBlurEnabled,
                    },
                    classNames?.base
                ),
                ...classNames,
            }}
        >
            {/* Pass the children (e.g., <ModalContent>) directly through. */}
            {children}
        </Modal>
    );
}
