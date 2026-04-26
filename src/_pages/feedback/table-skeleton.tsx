"use client";

import React from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Skeleton } from "@heroui/react";

interface FeedbackTableSkeletonProps {
  rowCount?: number;
}

export function FeedbackTableSkeleton({ rowCount = 10 }: FeedbackTableSkeletonProps) {
  return (
    <Table aria-label="Loading feedback table">
      <TableHeader>
        <TableColumn>TITLE</TableColumn>
        <TableColumn>TYPE</TableColumn>
        <TableColumn>STATUS</TableColumn>
        <TableColumn>VOTES</TableColumn>
        <TableColumn>USER</TableColumn>
        <TableColumn>CREATED</TableColumn>
        <TableColumn>ACTIONS</TableColumn>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16 rounded-sm" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-20 rounded-sm" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-8 rounded-sm" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="flex rounded-full w-8 h-8" />
                <Skeleton className="h-4 w-20 rounded-sm" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16 rounded-sm" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-8 rounded-sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
