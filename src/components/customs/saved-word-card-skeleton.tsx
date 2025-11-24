import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";

export default function SavedWordCardSkeleton() {
  return (
    <Card className="h-[200px] border border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-md shadow-lg">
      <CardHeader className="flex flex-col items-start gap-2 pt-6 px-6 pb-2">
        <div className="h-8 bg-default-200 rounded-lg w-3/4 animate-pulse" />
        <div className="h-4 bg-default-100 rounded-md w-1/4 animate-pulse" />
      </CardHeader>
      <CardBody className="px-6 py-2">
        <div className="space-y-2">
          <div className="h-4 bg-default-100 rounded-md w-full animate-pulse" />
          <div className="h-4 bg-default-100 rounded-md w-2/3 animate-pulse" />
        </div>
      </CardBody>
      <CardFooter className="px-6 pb-6 pt-2 flex justify-between items-center">
        <div className="h-4 bg-default-100 rounded-md w-24 animate-pulse" />
        <div className="h-8 bg-default-200 rounded-lg w-16 animate-pulse" />
      </CardFooter>
    </Card>
  );
}
