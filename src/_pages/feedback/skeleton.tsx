"use client";

import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Skeleton } from "@heroui/react";

interface FeedbackSkeletonProps {
  count?: number;
}

export function FeedbackSkeleton({ count = 3 }: FeedbackSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="border border-border rounded-sm p-2 w-full mb-4"
          isBlurred
        >
          <CardHeader className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex gap-2 md:gap-4">
              {/* Avatar skeleton */}
              <Skeleton className="flex rounded-full w-10 h-10" />
              <div className="flex flex-col gap-2">
                {/* User name skeleton */}
                <Skeleton className="h-3 w-20 rounded-sm" />
                {/* Date skeleton */}
                <Skeleton className="h-3 w-16 rounded-sm" />
              </div>
            </div>
            <div className="sm:ml-auto flex flex-col xs:flex-row gap-2">
              {/* Status chip skeleton */}
              <Skeleton className="h-6 w-16 rounded-sm" />
              {/* Type chip skeleton */}
              <Skeleton className="h-6 w-12 rounded-sm" />
            </div>
          </CardHeader>
          <CardBody className="gap-3">
            {/* Title skeleton */}
            <Skeleton className="h-6 w-3/4 rounded-sm" />
            {/* Description skeleton - multiple lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-sm" />
              <Skeleton className="h-4 w-5/6 rounded-sm" />
              <Skeleton className="h-4 w-2/3 rounded-sm" />
            </div>
          </CardBody>
          <CardFooter className="gap-3">
            {/* Vote button skeleton */}
            <Skeleton className="h-8 w-24 rounded-sm" />
          </CardFooter>
        </Card>
      ))}
    </>
  );
}

export function FeedbackSkeletonGrid({ count = 6 }: FeedbackSkeletonProps) {
  return (
    <div className="grid gap-4">
      <FeedbackSkeleton count={count} />
    </div>
  );
}
