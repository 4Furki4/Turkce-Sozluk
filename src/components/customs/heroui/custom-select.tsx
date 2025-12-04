"use client";

import React from 'react';
import { Select, SelectItem, type SelectProps } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';

// Define the structure for the options we'll pass in.
// It's a simple key-value record, like your `entityTypeLabels` object.
export type OptionsMap = Record<string, string>;

// Define the props for our custom component.
// It accepts all the standard SelectProps from HeroUI, but makes `children` optional
// as we'll be generating them from the `options` prop.
export interface CustomSelectProps extends Omit<SelectProps, 'children'> {
    options: OptionsMap;
    showAllOption?: boolean; // A prop to control if the "All" option is shown
    allOptionLabel?: string; // A prop for the "All" option's text
}



export function CustomSelect({
    options,
    showAllOption = false,
    allOptionLabel = "All",
    className,
    classNames,
    ...props
}: CustomSelectProps) {
    // Get the default styles

    // We use tailwind-variants to define the default styles for our component slots.
    // This is the same system HeroUI uses internally.
    const customSelectStyles = tv({
        slots: {
            base: "",
            trigger: "border-2 border-primary/40 cursor-pointer",
            label: "text-foreground",
            listbox: "bg-background/10",
            popoverContent: "bg-background border-primary/40",
        }
    });
    const styles = customSelectStyles();
    return (
        <Select
            size="sm"
            color="primary"
            variant="bordered"
            // Spread the rest of the props. Any props you pass will override the defaults.
            // e.g., passing `variant="flat"` will override the default "bordered".
            {...props}
            className={cn("w-full", className)} // Merge base className
            // Deeply merge our default classNames with any custom ones passed in.
            // This allows you to override specific slots, like `trigger`, while keeping the others.
            classNames={{
                base: cn(styles.base(), classNames?.base),
                trigger: cn(styles.trigger(), classNames?.trigger),
                label: cn(styles.label(), classNames?.label),
                listbox: cn(styles.listbox(), classNames?.listbox),
                popoverContent: cn(styles.popoverContent(), classNames?.popoverContent),
                // Pass through any other classNames not defined in our defaults
                ...classNames,
            }}
        >
            <>
                {showAllOption && <SelectItem key="all">{allOptionLabel}</SelectItem>}
                {Object.entries(options).map(([key, label]) => (
                    <SelectItem key={key}>
                        {label}
                    </SelectItem>
                ))}
            </>
        </Select>
    );
}
