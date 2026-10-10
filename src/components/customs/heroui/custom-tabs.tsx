"use client";

import React from "react";
import { Tabs, type TabsProps } from "@heroui/react";
import { cn } from "@/lib/utils";

// Define the custom props for our new component.
// It simply extends the base TabsProps, so you can pass any valid prop.
export interface CustomTabsProps extends TabsProps { }

export function CustomTabs({
    children,
    classNames,
    ...props
}: CustomTabsProps) {
    return (
        <Tabs
            // Apply your default props
            color="primary"
            // Pass through any other props, allowing overrides
            {...props}
            // Deeply merge the default classNames with any provided via props
            classNames={{
                ...classNames,
                tabList: cn(
                    "w-full bg-primary/10 border border-primary",
                    classNames?.tabList
                ),
                tabContent: cn("text-primary md:w-full", classNames?.tabContent),
                tab: cn(
                    "data-[selected=true]:bg-primary/60",
                    classNames?.tab
                ),
            }}
        >
            {/* Render the children, which will be the <Tab> components */}
            {children}
        </Tabs>
    );
}
