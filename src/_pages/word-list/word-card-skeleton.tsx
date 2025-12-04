"use client";

import React from "react";
import { Card, CardHeader, CardBody, CardFooter, Skeleton } from "@heroui/react";

export function WordCardSkeleton() {
    return (
        <Card
            className="feature-card-shine group relative w-full h-full border border-white/10 bg-background/50 overflow-hidden"
        >
            <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6 pb-2">
                <div className="flex w-full justify-between items-start">
                    {/* Title Skeleton */}
                    <Skeleton className="h-8 w-3/4" />
                </div>
            </CardHeader>

            <CardBody className="px-6 py-2">
                <div className="flex flex-col gap-2">
                    {/* Meaning Skeleton */}
                    <Skeleton className="h-4 w-full" />
                </div>
            </CardBody>

            <CardFooter className="px-6 pb-6 pt-4 flex justify-end">
                {/* View Details Skeleton */}
                <Skeleton className="h-4 w-24" />
            </CardFooter>
        </Card>
    );
}
