"use client";

import React from 'react';
import { Pagination, type PaginationProps } from "@heroui/pagination";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';

// Define the default styles for the pagination slots using tailwind-variants.
const customPaginationStyles = tv({
    slots: {
        wrapper: "mx-auto",
        item: "[&[data-hover=true]:not([data-active=true])]:bg-primary/30 bg-primary/10 min-w-11 h-11 shrink-0 px-2",
        next: "[&[data-hover=true]:not([data-active=true])]:bg-primary/30 bg-primary/10 min-w-11 h-11 shrink-0 px-2",
        prev: "[&[data-hover=true]:not([data-active=true])]:bg-primary/30 bg-primary/10 min-w-11 h-11 shrink-0 px-2",
        cursor: "min-w-11 h-11 px-2",
    }
});

// We accept all of HeroUI's PaginationProps so we can override anything we need.
export interface CustomPaginationProps extends PaginationProps { }

export function CustomPagination({ className, classNames, ...props }: CustomPaginationProps) {
    // Get the default styles.
    const styles = customPaginationStyles();

    return (
        <Pagination
            isCompact
            showControls
            className={cn("max-w-full min-w-0 cursor-pointer", className)} // Merge base className
            // Deeply merge our default styles with any custom ones passed in.
            // This allows for overriding specific slots while keeping the others.
            classNames={{
                ...classNames,
                wrapper: cn(styles.wrapper(), classNames?.wrapper),
                item: cn(styles.item(), classNames?.item),
                next: cn(styles.next(), classNames?.next),
                prev: cn(styles.prev(), classNames?.prev),
                cursor: cn(styles.cursor(), classNames?.cursor),
            }}
            // Spread the rest of the props.
            {...props}
        />
    );
}
