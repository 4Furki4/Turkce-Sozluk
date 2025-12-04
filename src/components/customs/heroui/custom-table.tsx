"use client";

import React from 'react';
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Spinner,
    type TableProps
} from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

// Define the default styles for the table slots.
const customTableStyles = tv({
    slots: {
        base: "min-h-[300px]",
        wrapper: "overflow-y-hidden flex flex-col relative h-auto text-foreground box-border outline-hidden data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 rounded-sm p-2 w-full",
        td: "group-data-[odd=true]/tr:before:transition-all group-data-[odd=true]/tr:before:bg-primary/10",
        th: "bg-primary/10",
    }
});

// --- The Fix: Make the generic type T truly generic ---
// By changing `T extends { id: string | number }` to `T extends object`,
// we are no longer forcing every data item to have an `id` property.
// The component can now accept any array of objects.
export interface CustomTableProps<T extends object> extends Omit<TableProps, 'children'> {
    columns: { key: string; label: string; align?: 'start' | 'center' | 'end' }[];
    items: T[];
    renderCell: (item: T, columnKey: React.Key) => React.ReactNode;
    loadingState?: 'loading' | 'sorting' | 'loadingMore' | 'error' | 'idle' | 'filtering';
    emptyContent?: React.ReactNode;
}


export function CustomTable<T extends object>({
    columns,
    items,
    renderCell,
    loadingState,
    classNames,
    emptyContent,
    ...props
}: CustomTableProps<T>) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const styles = customTableStyles();

    return (
        <Table
            isCompact
            isStriped
            aria-label="Custom data table"
            classNames={{
                base: cn(styles.base(), classNames?.base),
                wrapper: cn(
                    styles.wrapper(),
                    {
                        "shadow-medium bg-background/10 backdrop-blur-md backdrop-saturate-150 transition-all duration-300 motion-reduce:transition-none": isBlurEnabled,
                        "bg-background/70 transition-all duration-300": !isBlurEnabled
                    },
                    classNames?.wrapper
                ),
                td: cn(
                    styles.td(),
                    { 'group-data-[odd=true]/tr:before:bg-primary/10': isBlurEnabled },
                    classNames?.td
                ),
                th: cn(styles.th(), classNames?.th),
                ...classNames
            }}
            {...props}
        >
            <TableHeader columns={columns}>
                {(column) => (
                    <TableColumn align={column.align || "start"} key={column.key}>
                        {column.label}
                    </TableColumn>
                )}
            </TableHeader>
            <TableBody
                items={items}
                loadingContent={<Spinner />}
                loadingState={loadingState}
                emptyContent={emptyContent}
            >
                {(item) => (
                    // --- The Fix: Let HeroUI handle the key ---
                    // The underlying Table component will automatically look for a `key` property
                    // on each `item` object. We no longer force it to be `item.id`.
                    // This makes the component much more flexible.
                    <TableRow>
                        {(columnKey) => (
                            <TableCell>{renderCell(item, columnKey)}</TableCell>
                        )}
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
