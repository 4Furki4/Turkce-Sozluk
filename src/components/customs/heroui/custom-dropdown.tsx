import React from 'react'
import { Dropdown, type DropdownProps } from "@heroui/react";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { cn } from "@/lib/utils";
export interface CustomDropdownProps extends DropdownProps {
    children: React.ReactNode[];
}


export default function CustomDropdown({ children, ...props }: CustomDropdownProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    return (
        <Dropdown radius='sm' {...props} motionProps={{
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
                        duration: 0.05,
                        ease: "easeIn",
                    },
                },
            },
        }}
            classNames={{
                content: cn("bg-background/70 backdrop-blur-sm", isBlurEnabled && "bg-background/70 backdrop-blur-sm", props.classNames?.content),

                ...props.classNames
            }}>
            {children}
        </Dropdown>
    )
}
