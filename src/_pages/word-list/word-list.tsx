"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { api } from "@/src/trpc/react";
import { Link as NextUILink } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { keepPreviousData } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSnapshot } from "valtio";
import { preferencesState } from "@/src/store/preferences";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomSelect, OptionsMap } from "@/src/components/customs/heroui/custom-select";
import { FilterBar } from "./filter-bar";
import { AlphabetBar } from "./alphabet-bar";


const areArraysEqual = (arr1: string[], arr2: string[]) => {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((value, index) => value === sorted2[index]);
};

const wordPerPageOptions = [
    {
        label: "5",
        key: "5"
    },
    {
        label: "10",
        key: "10"
    },
    {
        label: "20",
        key: "20"
    },
    {
        label: "50",
        key: "50"
    }
]

export default function WordList() {
    const t = useTranslations('WordList');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { isBlurEnabled } = useSnapshot(preferencesState);
    // Get initial values from URL params
    const initialPage = Number(searchParams.get('page')) || 1;
    const initialPerPage = Number(searchParams.get('per_page')) || 10;

    const initialSearch = searchParams.get('search') || "";
    const initialPos = searchParams.get('pos') ? searchParams.get('pos')!.split(',') : [];
    const initialLang = searchParams.get('lang') ? searchParams.get('lang')!.split(',') : [];
    const initialAttr = searchParams.get('attr') ? searchParams.get('attr')!.split(',') : [];

    const initialSortBy = (searchParams.get('sort') as 'alphabetical' | 'date' | 'length') || 'alphabetical';
    const initialSortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'asc';
    const initialLetter = searchParams.get('letter') || null;

    const [pageNumber, setPageNumber] = React.useState<number>(initialPage);
    const [wordsPerPage, setWordsPerPage] = React.useState<number>(initialPerPage);
    const [selectedPos, setSelectedPos] = React.useState<string[]>(initialPos);
    const [selectedLang, setSelectedLang] = React.useState<string[]>(initialLang);
    const [selectedAttr, setSelectedAttr] = React.useState<string[]>(initialAttr);
    const [sortBy, setSortBy] = React.useState<'alphabetical' | 'date' | 'length'>(initialSortBy);
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(initialSortOrder);
    const [selectedLetter, setSelectedLetter] = React.useState<string | null>(initialLetter);

    const { control, watch, setValue } = useForm({
        defaultValues: {
            search: initialSearch
        }
    });

    const debouncedSearch = useDebounce(watch("search"), 500);
    const isFirstRender = useRef(true);

    // reset to first page when search changes
    useEffect(() => {
        setPageNumber(1);
    }, [debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter]);

    // update state on URL param changes (back/forward)
    useEffect(() => {
        if (isFirstRender.current) return;
        const paramPage = Number(searchParams.get('page')) || 1;
        const paramPer = Number(searchParams.get('per_page')) || 10;

        const paramSearch = searchParams.get('search') || '';
        const paramPos = searchParams.get('pos') ? searchParams.get('pos')!.split(',') : [];
        const paramLang = searchParams.get('lang') ? searchParams.get('lang')!.split(',') : [];
        const paramAttr = searchParams.get('attr') ? searchParams.get('attr')!.split(',') : [];
        const paramSortBy = (searchParams.get('sort') as 'alphabetical' | 'date' | 'length') || 'alphabetical';
        const paramSortOrder = (searchParams.get('order') as 'asc' | 'desc') || 'asc';
        const paramLetter = searchParams.get('letter') || null;

        setPageNumber(paramPage);
        setWordsPerPage(paramPer);

        if (!areArraysEqual(selectedPos, paramPos)) setSelectedPos(paramPos);
        if (!areArraysEqual(selectedLang, paramLang)) setSelectedLang(paramLang);
        if (!areArraysEqual(selectedAttr, paramAttr)) setSelectedAttr(paramAttr);
        if (sortBy !== paramSortBy) setSortBy(paramSortBy);
        if (sortOrder !== paramSortOrder) setSortOrder(paramSortOrder);
        if (selectedLetter !== paramLetter) setSelectedLetter(paramLetter);

        setValue('search', paramSearch, { shouldDirty: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, setValue]);

    // sync state to URL, enable back/forward history
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedPos.length > 0) params.set('pos', selectedPos.join(','));
        if (selectedLang.length > 0) params.set('lang', selectedLang.join(','));
        if (selectedAttr.length > 0) params.set('attr', selectedAttr.join(','));
        if (sortBy !== 'alphabetical') params.set('sort', sortBy);
        if (sortOrder !== 'asc') params.set('order', sortOrder);
        if (selectedLetter) params.set('letter', selectedLetter);

        params.set('page', pageNumber.toString());
        params.set('per_page', wordsPerPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    }, [pageNumber, wordsPerPage, debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter, pathname, router]);

    const { data: wordCount } = api.word.getWordCount.useQuery({
        search: debouncedSearch,
        partOfSpeechId: selectedPos,
        languageId: selectedLang,
        attributeId: selectedAttr,
        startsWith: selectedLetter || undefined
    })

    const totalPageNumber = wordCount ? Math.ceil(wordCount / wordsPerPage) : undefined;
    const wordsQuery = api.word.getWords.useQuery({
        take: wordsPerPage,
        skip: (pageNumber - 1) * wordsPerPage,
        search: debouncedSearch,
        partOfSpeechId: selectedPos,
        languageId: selectedLang,
        attributeId: selectedAttr,
        sortBy,
        sortOrder,
        startsWith: selectedLetter || undefined
    }, {
        placeholderData: keepPreviousData
    })

    type Row = (typeof rows)[0];
    const rows = wordsQuery.data?.map((word, idx) => {
        return {
            name: word.name,
            key: word.word_id,
            meaning: word.meaning,
        };
    }) || []

    const columns = [
        {
            key: "name",
            label: t('columns.word'),
        },
        {
            key: "meaning",
            label: t('columns.meaning'),
        },
    ];

    const renderCell = useCallback((item: Row, columnKey: React.Key) => {
        const cellValue = item[columnKey as keyof Row];
        switch (columnKey) {
            case "name":
                return (
                    <NextUILink target="_blank" color="primary" underline="hover" as={Link} href={`/search/${encodeURIComponent(item.name)}`}>
                        {cellValue}
                    </NextUILink>
                );
            default:
                return cellValue;
        }
    }, []);

    return (
        <section>
            <CustomTable
                columns={columns}
                items={rows}
                renderCell={renderCell}
                loadingState={wordsQuery.isFetching ? 'loading' : 'idle'}
                bottomContent={
                    <CustomPagination
                        total={totalPageNumber ?? 1}
                        initialPage={pageNumber}
                        page={pageNumber}
                        onChange={(page) => {
                            setPageNumber(page);
                        }}
                    />
                }
                topContent={
                    <div className="flex flex-col gap-4 p-4 bg-background/10 rounded-large shadow-small">
                        <h1 className="text-fs-1">
                            {t('title')}
                        </h1>
                        <Controller name="search" control={control} render={({ field }) => (
                            <CustomInput
                                {...field}
                                placeholder={t('searchPlaceholder')}
                                size="lg"
                            />
                        )}
                        />
                        <div className="flex flex-col sm:flex-row  gap-4 w-full">
                            <FilterBar
                                selectedPos={selectedPos}
                                selectedLang={selectedLang}
                                selectedAttr={selectedAttr}
                                onPosChange={setSelectedPos}
                                onLangChange={setSelectedLang}
                                onAttrChange={setSelectedAttr}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortChange={(sort, order) => {
                                    setSortBy(sort);
                                    setSortOrder(order);
                                }}
                            />
                            <CustomSelect
                                options={wordPerPageOptions.reduce((acc, option) => {
                                    acc[option.key] = option.label;
                                    return acc;
                                }, {} as OptionsMap)}
                                label={t('wordsPerPage')}

                                selectedKeys={[wordsPerPage.toString()]}
                                onChange={(e) => {
                                    setWordsPerPage(parseInt(e.target.value));
                                }}
                            />
                        </div>

                        <AlphabetBar
                            selectedLetter={selectedLetter}
                            onLetterSelect={setSelectedLetter}
                        />
                    </div>
                }

            />
        </section >
    );
}
