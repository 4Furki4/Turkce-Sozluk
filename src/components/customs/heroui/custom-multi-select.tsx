"use client";

import React from 'react';
import { Select, SelectItem, type SelectProps, Selection } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';
import { X } from 'lucide-react';

// Define the structure for the options we'll pass in.
export type OptionsMap = Record<string, string> | { key: string; label: string }[];

// Define the props for our custom component.
export interface CustomMultiSelectProps extends Omit<SelectProps, 'children' | 'selectedKeys' | 'onSelectionChange'> {
    options: OptionsMap;
    selectedKeys: string[];
    onSelectionChange: (keys: string[]) => void;
    placeholder?: string;
    onClear?: () => void;
}

export function CustomMultiSelect({
    options,
    selectedKeys,
    onSelectionChange,
    placeholder = "Select options",
    onClear,
    className,
    classNames,
    ...props
}: CustomMultiSelectProps) {
    // We use tailwind-variants to define the default styles for our component slots.
    const customMultiSelectStyles = tv({
        slots: {
            base: "sm:max-w-64",
            trigger: "border-2 border-primary/40 cursor-pointer",
            label: "text-foreground",
            listbox: "bg-background/10",
            popoverContent: "bg-background border-primary/40",
        }
    });

    const styles = customMultiSelectStyles();

    const handleSelectionChange = (selection: Selection) => {
        if (selection === "all") {
            onSelectionChange(Object.keys(options));
        } else {
            onSelectionChange(Array.from(selection) as string[]);
        }
    };

    return (
        <Select
            size="sm"
            color="primary"
            variant="bordered"
            selectionMode="multiple"
            placeholder={placeholder}
            selectedKeys={new Set(selectedKeys)}
            onSelectionChange={handleSelectionChange}
            className={className}
            classNames={{
                base: cn(styles.base(), classNames?.base),
                trigger: cn(styles.trigger(), classNames?.trigger),
                label: cn(styles.label(), classNames?.label),
                listbox: cn(styles.listbox(), classNames?.listbox),
                popoverContent: cn(styles.popoverContent(), classNames?.popoverContent),
                ...classNames,
            }}
            {...props}
            endContent={
                selectedKeys.length > 0 && onClear ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onClear();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-default-100 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={14} className="text-default-500" />
                    </button>
                ) : undefined
            }
        >
            {Array.isArray(options) ? options.map(option => (
                <SelectItem key={option.key}>
                    {option.label}
                </SelectItem>
            )) : Object.entries(options).map(([key, label]) => (
                <SelectItem key={key}>
                    {label}
                </SelectItem>
            ))}
        </Select>
    );
}
