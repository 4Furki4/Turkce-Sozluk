"use client";

import React from 'react';
import { Input, type InputProps } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

// Define the default styles for the input slots.
const customInputStyles = tv({
    slots: {
        inputWrapper: [
            "border-2",
            "border-primary/40",
            "shadow-xl",
            "group-data-[hover=true]:border-primary/60",
        ],
        input: [
            "text-base",
            "text-foreground",
            "placeholder:text-muted-foreground",
        ]
    },
    variants: {
        isBlurred: {
            true: {
                inputWrapper: "backdrop-blur-xs",
            }
        }
    }
});

// We accept all of HeroUI's InputProps so we can override anything we need.
export interface CustomInputProps extends InputProps { }

export const CustomInput = React.forwardRef<HTMLInputElement, CustomInputProps>(
    ({ className, classNames, ...props }, ref) => {
        const { isBlurEnabled } = useSnapshot(preferencesState);
        // Get the styles, applying the blur variant based on user preference.
        const styles = customInputStyles({ isBlurred: isBlurEnabled });

        return (
            <Input
                radius='md'
                ref={ref}
                color="primary"
                variant="bordered"
                size="lg"
                // Deeply merge our default styles with any custom ones passed in.
                classNames={{
                    inputWrapper: cn(styles.inputWrapper(), classNames?.inputWrapper),
                    input: cn(styles.input(), classNames?.input),
                    ...classNames,
                }}
                // Spread the rest of the props.
                {...props}
            />
        );
    }
);

CustomInput.displayName = "CustomInput";
