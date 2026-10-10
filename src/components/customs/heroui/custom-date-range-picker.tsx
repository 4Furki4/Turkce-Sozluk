"use client";

import React from 'react';
import { DateRangePicker, type DateRangePickerProps } from "@heroui/react";
import { cn } from '@/lib/utils';
import { tv } from 'tailwind-variants';
import type { RangeValue } from "@react-types/shared";
import type { DateValue } from "@internationalized/date";
import { fromDate, toCalendarDate, getLocalTimeZone } from "@internationalized/date";

export interface CustomDateRangePickerProps extends Omit<DateRangePickerProps, 'children' | 'value' | 'onChange'> {
    onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
    value?: { start: Date; end: Date } | null;
}

export function CustomDateRangePicker({
    onDateRangeChange,
    value,
    className,
    classNames,
    ...props
}: CustomDateRangePickerProps) {
    // We use tailwind-variants to define the default styles for our component slots.
    const customDateRangePickerStyles = tv({
        slots: {
            base: "sm:max-w-64",
            inputWrapper: "border-2 border-primary/40",
            label: "text-foreground",
            popoverContent: "bg-background border-primary/40",
        }
    });

    const styles = customDateRangePickerStyles();

    // Convert Date objects to DateValue objects if value is provided
    const dateRangeValue = React.useMemo<RangeValue<DateValue> | null>(() => {
        if (!value) return null;

        try {
            return {
                start: toCalendarDate(fromDate(value.start, getLocalTimeZone())),
                end: toCalendarDate(fromDate(value.end, getLocalTimeZone())),
            };
        } catch (error) {
            console.error('Error parsing dates for DateRangePicker:', error);
            return null;
        }
    }, [value]);

    const handleValueChange = (value: RangeValue<DateValue> | null) => {
        if (!onDateRangeChange) return;

        if (!value) {
            onDateRangeChange(null, null);
            return;
        }

        // Convert DateValue to Date
        const startDate = value.start ? value.start.toDate(getLocalTimeZone()) : null;
        const endDate = value.end ? value.end.toDate(getLocalTimeZone()) : null;

        onDateRangeChange(startDate, endDate);
    };

    return (
        <DateRangePicker
            size="sm"
            color="primary"
            variant="bordered"
            value={dateRangeValue}
            onChange={handleValueChange}
            className={className}
            classNames={{
                ...classNames,
                base: cn(styles.base(), classNames?.base),
                inputWrapper: cn(styles.inputWrapper(), classNames?.inputWrapper),
                label: cn(styles.label(), classNames?.label),
                popoverContent: cn(styles.popoverContent(), classNames?.popoverContent),
            }}
            {...props}
        />
    );
}
