import React from "react";
import { Skeleton } from "@heroui/react";

export default function PopularSearchesSkeleton() {
    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-32 h-6 rounded-lg" />
            </div>
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }).map((_, index) => (
                    <Skeleton key={index} className="w-24 h-8 rounded-sm" />
                ))}
            </div>
        </div>
    );
}
