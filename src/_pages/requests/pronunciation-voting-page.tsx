"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/src/trpc/react";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useTranslations } from "next-intl";
import { Button, CardHeader, CardFooter } from "@heroui/react";
import { PronunciationCard } from "@/src/components/requests/pronunciation-card";
import { NewPronunciationRequestModal } from "@/src/components/requests/new-pronunciation-request-modal";
import { Mic } from "lucide-react";
import { useDisclosure } from "@heroui/react";
import { Pagination } from "@/src/components/shared/pagination";
import { PronunciationCardSkeleton } from "@/src/components/requests/pronunciation-card-skeleton";
import { keepPreviousData } from "@tanstack/react-query";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { RequestPronunciationModal } from "@/src/components/requests/request-pronunciation-modal";

export function PronunciationVotingPage() {
    const t = useTranslations("PronunciationVoting");
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "createdAt");
    const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") || "desc");
    const { isOpen: isNewRequestModalOpen, onOpen: openNewRequestModal, onClose: closeNewRequestModal } = useDisclosure();
    const { isOpen: isQuickRequestModalOpen, onOpen: openQuickRequestModal, onClose: closeQuickRequestModal } = useDisclosure();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const { data, isLoading, isError } = api.request.getVotablePronunciationRequests.useQuery(
        {
            search: debouncedSearchTerm,
            sortBy: sortBy as 'createdAt' | 'voteCount',
            sortOrder: sortOrder as 'asc' | 'desc',
            page,
            limit: 10,
        },
        {
            placeholderData: keepPreviousData
        }
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        updateURL({ search: e.target.value, page: 1 });
    };

    const handleSortChange = (newSortBy: string) => {
        const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        updateURL({ sortBy: newSortBy, sortOrder: newSortOrder });
    }

    const handlePageChange = (newPage: number) => {
        updateURL({ page: newPage });
    };

    const updateURL = (updates: Record<string, any>) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value) {
                params.set(key, String(value));
            } else {
                params.delete(key);
            }
        });
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <Button color="primary" onPress={openNewRequestModal} className="ml-auto">
                    <Mic className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">{t("requestPronunciation")}</span>
                </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 lg:flex lg:flex-row items-center mb-4 gap-4">
                <CustomInput
                    placeholder={t("searchPlaceholder")}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    classNames={{
                        base: "col-span-1 row-span-1 sm:col-span-2 sm:row-span-2"
                    }}
                    size="md"
                />

                <Button
                    color="primary"
                    variant={sortBy === 'createdAt' ? 'solid' : 'bordered'}
                    onPress={() => handleSortChange('createdAt')}
                    className="min-w-max"
                >
                    {t("sortByDate")} {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                </Button>
                <Button
                    color="primary"
                    variant={sortBy === 'voteCount' ? 'solid' : 'bordered'}
                    onPress={() => handleSortChange('voteCount')}
                    className="min-w-max"
                >
                    {t("sortByVotes")} {sortBy === 'voteCount' && (sortOrder === 'desc' ? '↓' : '↑')}
                </Button>
            </div>

            {isLoading && (
                <div className="grid gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <PronunciationCardSkeleton key={i} />
                    ))}
                </div>
            )}
            {isError && <div>{t("error")}</div>}

            {data && data.requests.length === 0 && debouncedSearchTerm && (
                <CustomCard classNames={{
                }} className="border-primary border-dashed border-2">
                    <CardHeader className="flex justify-center">
                        {t("noResults", { searchTerm: debouncedSearchTerm })}
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button color="primary" onPress={openQuickRequestModal}>
                            {t("requestPronunciation")}
                        </Button>
                    </CardFooter>
                </CustomCard>
            )}

            <div className="grid gap-4">
                {data?.requests.map((props) => (
                    <PronunciationCard
                        key={props.request.id}
                        {...props}
                    />
                ))}
            </div>

            {data && data.totalPages > 1 && (
                <div className="mt-8">
                    <Pagination
                        currentPage={page}
                        totalPages={data.totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}
            <NewPronunciationRequestModal
                isOpen={isNewRequestModalOpen}
                onClose={closeNewRequestModal}
            />
            <RequestPronunciationModal
                isOpen={isQuickRequestModalOpen}
                onClose={closeQuickRequestModal}
                searchTerm={debouncedSearchTerm}
            />
        </div>
    );
}