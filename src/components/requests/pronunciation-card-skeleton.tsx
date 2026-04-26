import { CardHeader, CardBody, CardFooter, Skeleton } from "@heroui/react";
import CustomCard from "../customs/heroui/custom-card";

export const PronunciationCardSkeleton = () => {
    return (
        <CustomCard>
            <CardHeader className="justify-between">
                <div className="flex gap-5">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex flex-col gap-2 items-start justify-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
            </CardHeader>
            <CardBody className="px-3 py-0">
                <Skeleton className="h-6 w-40" />
            </CardBody>
            <CardFooter className="gap-3">
                <div className="flex gap-1 items-center">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-8 w-8" />
                </div>
                <div className="flex gap-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-28" />
                </div>
            </CardFooter>
        </CustomCard>
    );
};
