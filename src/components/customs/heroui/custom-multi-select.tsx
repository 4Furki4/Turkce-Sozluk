"use client";

import React from 'react';
import { Select, SelectItem, type SelectProps, Selection } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    placeholder,
    onClear,
    className,
    classNames,
    ...props
}: CustomMultiSelectProps) {
    const t = useTranslations('SharedUI');
    const containerRef = React.useRef<HTMLDivElement>(null);
    // We use tailwind-variants to define the default styles for our component slots.
    const customMultiSelectStyles = tv({
        slots: {
            base: "",
            trigger: "border-2 border-primary/40 cursor-pointer",
            label: "text-foreground",
            listbox: "bg-background/10",
            popoverContent: "bg-background border-primary/40",
        }
    });

    const styles = customMultiSelectStyles();

    const handleSelectionChange = (selection: Selection) => {
        if (selection === "all") {
            onSelectionChange(Array.isArray(options) ? options.map(option => option.key) : Object.keys(options));
        } else {
            onSelectionChange(Array.from(selection) as string[]);
        }
    };

    const clearable = selectedKeys.length > 0 && onClear;
    const selectionLabel = typeof props.label === 'string' ? props.label : props['aria-label'] ?? t('Selection');

    return (
        <div ref={containerRef} className={cn("flex min-w-0 items-center gap-1", className)}>
            <Select
                size="sm"
                color="primary"
                variant="bordered"
                {...props}
                selectionMode="multiple"
                placeholder={placeholder ?? t('SelectOptions')}
                selectedKeys={new Set(selectedKeys)}
                onSelectionChange={handleSelectionChange}
                className="w-full min-w-0"
                classNames={{
                    ...classNames,
                    base: cn(styles.base(), classNames?.base),
                    trigger: cn(styles.trigger(), classNames?.trigger),
                    label: cn(styles.label(), classNames?.label),
                    listbox: cn(styles.listbox(), classNames?.listbox),
                    popoverContent: cn(styles.popoverContent(), classNames?.popoverContent),
                }}
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
            {clearable ? (
                <button
                    type="button"
                    aria-label={t('ClearSelection', { label: selectionLabel })}
                    disabled={props.isDisabled || props.isLoading || props.disallowEmptySelection}
                    onClick={() => {
                        onClear();
                        containerRef.current?.querySelector<HTMLButtonElement>('button[data-slot="trigger"]')?.focus();
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-default-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            ) : null}
        </div>
    );
}
