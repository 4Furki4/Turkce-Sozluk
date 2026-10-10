"use client";

import React from 'react';
import { Select, type SelectProps } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';

// Define the default styles for our component slots.
const customSelectStyles = tv({
    slots: {
        base: "sm:max-w-64",
        trigger: "border-2 border-primary/40 h-14",
        mainWrapper: "h-14",
        label: "text-foreground",
        listbox: "bg-background/90",
        popoverContent: "bg-background/80 backdrop-blur-sm border-primary/40",
    }
});

// The props for our custom component extend the base SelectProps with proper generics
export interface CustomSelectProps<T extends object> extends SelectProps<T> { }

// Fix the component to properly handle generics
export const CustomSelect = <T extends object>(
    { children, className, classNames, ...props }: CustomSelectProps<T>
) => {
    // Get the default styles from our definition above.
    const styles = customSelectStyles();

    return (
        <Select<T>
            // Apply default props. These can be overridden by passing them to <CustomSelect>.
            size="sm"
            color="primary"
            variant="bordered"
            // Pass through any other props like `label`, `selectedKeys`, `onChange`, etc.
            {...props}
            className={cn("w-full", className)}
            // Deeply merge our default classNames with any custom ones passed in.
            classNames={{
                ...classNames,
                base: cn(styles.base(), classNames?.base),
                trigger: cn(styles.trigger(), classNames?.trigger),
                mainWrapper: cn(styles.mainWrapper(), classNames?.mainWrapper),
                label: cn(styles.label(), classNames?.label),
                listbox: cn(styles.listbox(), classNames?.listbox),
                popoverContent: cn(styles.popoverContent(), classNames?.popoverContent),
            }}
        >
            {/*
          Render the children directly. This allows you to define the
          <SelectItem> components yourself in the parent component.
        */}
            {children}
        </Select>
    );
};

CustomSelect.displayName = "CustomSelect";
