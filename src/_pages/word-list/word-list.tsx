"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { api } from "@/src/trpc/react";
import { Button, ButtonGroup } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { keepPreviousData } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";
import { usePathname, useSearchParams } from "next/navigation";
import { useProgressRouter as useRouter } from "@/src/hooks/use-progress-router";
import { useTranslations } from "next-intl";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomSelect, OptionsMap } from "@/src/components/customs/heroui/custom-select";
import { FilterBar } from "./filter-bar";
import { AlphabetBar } from "./alphabet-bar";
import { WordCard } from "./word-card";
import { ChevronDown, ChevronUp, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { WordCardSkeleton } from "./word-card-skeleton";


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
    const initialViewMode = (searchParams.get('view') as 'list' | 'grid') || 'list';

    const [pageNumber, setPageNumber] = React.useState<number>(initialPage);
    const [wordsPerPage, setWordsPerPage] = React.useState<number>(initialPerPage);
    const [selectedPos, setSelectedPos] = React.useState<string[]>(initialPos);
    const [selectedLang, setSelectedLang] = React.useState<string[]>(initialLang);
    const [selectedAttr, setSelectedAttr] = React.useState<string[]>(initialAttr);
    const [sortBy, setSortBy] = React.useState<'alphabetical' | 'date' | 'length'>(initialSortBy);
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(initialSortOrder);
    const [selectedLetter, setSelectedLetter] = React.useState<string | null>(initialLetter);
    const [viewMode, setViewMode] = React.useState<'list' | 'grid'>(initialViewMode);
    const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(
        initialPos.length > 0 || initialLang.length > 0 || initialAttr.length > 0,
    );
    const [pageJumpInput, setPageJumpInput] = React.useState(initialPage.toString());

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
    }, [debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter, viewMode]);

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
        const paramView = (searchParams.get('view') as 'list' | 'grid') || 'list';

        setPageNumber(paramPage);
        setWordsPerPage(paramPer);

        if (!areArraysEqual(selectedPos, paramPos)) setSelectedPos(paramPos);
        if (!areArraysEqual(selectedLang, paramLang)) setSelectedLang(paramLang);
        if (!areArraysEqual(selectedAttr, paramAttr)) setSelectedAttr(paramAttr);
        if (sortBy !== paramSortBy) setSortBy(paramSortBy);
        if (sortOrder !== paramSortOrder) setSortOrder(paramSortOrder);
        if (selectedLetter !== paramLetter) setSelectedLetter(paramLetter);
        if (viewMode !== paramView) setViewMode(paramView);

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
        if (selectedPos.length > 0) params.set('pos', selectedPos.join(','));
        if (selectedLang.length > 0) params.set('lang', selectedLang.join(','));
        if (selectedAttr.length > 0) params.set('attr', selectedAttr.join(','));
        if (sortBy !== 'alphabetical') params.set('sort', sortBy);
        if (sortOrder !== 'asc') params.set('order', sortOrder);
        if (selectedLetter) params.set('letter', selectedLetter);
        if (viewMode !== 'list') params.set('view', viewMode);

        params.set('page', pageNumber.toString());
        params.set('per_page', wordsPerPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    }, [pageNumber, wordsPerPage, debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter, viewMode, pathname, router]);

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
    const rows = wordsQuery.data?.map((word) => {
        return {
            name: word.name,
            key: word.word_id,
            meaning: word.meaning,
            relatedWord: word.related_word_name,
            relationType: word.relation_type,
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

    const sortOptions: OptionsMap = {
        'alphabetical-asc': t('sorting.alphabeticalAsc'),
        'alphabetical-desc': t('sorting.alphabeticalDesc'),
        'date-desc': t('sorting.dateDesc'),
        'date-asc': t('sorting.dateAsc'),
        'length-asc': t('sorting.lengthAsc'),
        'length-desc': t('sorting.lengthDesc'),
    };

    const wordsPerPageSelectOptions = wordPerPageOptions.reduce((acc, option) => {
        acc[option.key] = option.label;
        return acc;
    }, {} as OptionsMap);

    const totalWords = wordCount ?? 0;
    const startWord = totalWords === 0 ? 0 : (pageNumber - 1) * wordsPerPage + 1;
    const endWord = totalWords === 0 ? 0 : Math.min(pageNumber * wordsPerPage, totalWords);
    const activeAdvancedFilterCount = selectedPos.length + selectedLang.length + selectedAttr.length;

    useEffect(() => {
        setPageJumpInput(pageNumber.toString());
    }, [pageNumber]);

    const renderCell = useCallback((item: Row, columnKey: React.Key) => {
        const cellValue = item[columnKey as keyof Row];
        switch (columnKey) {
            case "name":
                return (
                    <Link
                        target="_blank"
                        className="text-primary hover:underline"
                        href={{ pathname: '/search/[word]', params: { word: item.name } }}
                    >
                        {cellValue}
                    </Link>
                );
            case "meaning":
                if (!cellValue && item.relatedWord) {
                    return (
                        <span className="text-muted-foreground italic">
                            {item.relationType === 'turkish_equivalent' ? 'Türkçe karşılığı:' : 'Bakınız:'} <Link href={{ pathname: '/search/[word]', params: { word: item.relatedWord } }} className="ml-1 text-primary hover:underline">{item.relatedWord}</Link>
                        </span>
                    );
                }
                return cellValue || <span className="text-muted-foreground italic">Anlam bulunamadı</span>;
            default:
                return cellValue;
        }
    }, []);

    const handlePageJump = (e: React.FormEvent) => {
        e.preventDefault();
        const rawPage = Number(pageJumpInput);
        if (!Number.isFinite(rawPage)) return;
        const boundedPage = Math.min(Math.max(1, Math.floor(rawPage)), totalPageNumber ?? 1);
        setPageNumber(boundedPage);
        setPageJumpInput(boundedPage.toString());
    };

    const viewModeControls = (isMobile = false) => (
        <ButtonGroup className={isMobile ? "sm:hidden" : "hidden sm:flex"}>
            <Button
                isIconOnly
                size={isMobile ? "md" : "lg"}
                variant={viewMode === 'list' ? "solid" : "bordered"}
                color={viewMode === 'list' ? "primary" : "default"}
                onPress={() => setViewMode('list')}
            >
                <List size={20} />
            </Button>
            <Button
                isIconOnly
                size={isMobile ? "md" : "lg"}
                variant={viewMode === 'grid' ? "solid" : "bordered"}
                color={viewMode === 'grid' ? "primary" : "default"}
                onPress={() => setViewMode('grid')}
            >
                <LayoutGrid size={20} />
            </Button>
        </ButtonGroup>
    );

    const toolbarSelectClassNames = {
        base: "w-full max-w-none",
        label: "whitespace-nowrap",
        trigger: "min-h-14",
        popoverContent: "min-w-[220px]",
    };

    const filterSection = (
        <div className="flex flex-col gap-4 p-4 bg-background/10 rounded-large shadow-small">
            <h1 className="text-fs-1">{t('title')}</h1>

            <div className="flex flex-row gap-4">
                <Controller
                    name="search"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            {...field}
                            placeholder={t('searchPlaceholder')}
                            size="lg"
                        />
                    )}
                />
                {viewModeControls(false)}
            </div>

            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                <div className="w-full lg:flex-1">
                    <CustomSelect
                        size="md"
                        options={sortOptions}
                        label={t('sorting.label')}
                        classNames={toolbarSelectClassNames}
                        selectedKeys={[`${sortBy}-${sortOrder}`]}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (!value) return;
                            const [sort, order] = value.split('-');
                            setSortBy(sort as 'alphabetical' | 'date' | 'length');
                            setSortOrder(order as 'asc' | 'desc');
                        }}
                    />
                </div>
                <div className="w-full sm:max-w-[240px]">
                    <CustomSelect
                        size="md"
                        options={wordsPerPageSelectOptions}
                        label={t('wordsPerPage')}
                        classNames={toolbarSelectClassNames}
                        selectedKeys={[wordsPerPage.toString()]}
                        onChange={(e) => {
                            setWordsPerPage(parseInt(e.target.value));
                        }}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button
                    variant="flat"
                    color="primary"
                    onPress={() => setShowAdvancedFilters((prev) => !prev)}
                    startContent={<SlidersHorizontal size={16} />}
                    endContent={showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                >
                    {showAdvancedFilters ? t('advancedFilters.hide') : t('advancedFilters.show')}
                </Button>
                <div className="flex justify-start lg:justify-end lg:ml-auto">
                    {viewModeControls(true)}
                </div>
                {activeAdvancedFilterCount > 0 ? (
                    <span className="text-xs text-primary font-medium">
                        {t('advancedFilters.selectedCount', { count: activeAdvancedFilterCount })}
                    </span>
                ) : null}
            </div>

            {showAdvancedFilters ? (
                <FilterBar
                    selectedPos={selectedPos}
                    selectedLang={selectedLang}
                    selectedAttr={selectedAttr}
                    onPosChange={setSelectedPos}
                    onLangChange={setSelectedLang}
                    onAttrChange={setSelectedAttr}
                />
            ) : null}

            <AlphabetBar
                selectedLetter={selectedLetter}
                onLetterSelect={setSelectedLetter}
            />
        </div>
    );

    const paginationSection = (
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-2">
            <p className="text-sm text-muted-foreground">
                {t('pagination.summary', { from: startWord, to: endWord, total: totalWords })}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <CustomPagination
                    total={totalPageNumber ?? 1}
                    initialPage={pageNumber}
                    page={pageNumber}
                    onChange={(page) => {
                        setPageNumber(page);
                    }}
                />
                <form onSubmit={handlePageJump} className="flex items-center gap-2">
                    <CustomInput
                        size="sm"
                        type="number"
                        min={1}
                        max={totalPageNumber ?? 1}
                        value={pageJumpInput}
                        onValueChange={setPageJumpInput}
                        placeholder={t('pagination.jumpTo')}
                        className="w-28"
                    />
                    <Button type="submit" size="sm" color="primary" variant="flat">
                        {t('pagination.go')}
                    </Button>
                </form>
            </div>
        </div>
    );

    return (
        <section>
            {viewMode === 'list' ? (
                <CustomTable
                    columns={columns}
                    items={rows}
                    renderCell={renderCell}
                    isCompact={false}
                    loadingState={wordsQuery.isFetching ? 'loading' : 'idle'}
                    classNames={{
                        th: "bg-primary/15 text-foreground py-3 text-sm font-semibold",
                        td: "py-3.5 text-sm leading-relaxed group-data-[odd=true]/tr:before:bg-primary/8",
                    }}
                    bottomContent={wordCount ? paginationSection : null}
                    topContent={filterSection}

                />
            ) : (
                <div className="flex flex-col gap-6 shadow-medium p-2">
                    {filterSection}

                    {wordsQuery.isFetching ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: wordsPerPage }).map((_, i) => (
                                <WordCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {wordsQuery.data?.map((word) => (
                                    <WordCard
                                        key={word.word_id}
                                        id={word.word_id.toString()}
                                        name={word.name}
                                        meanings={word.meaning ? [{ id: '1', meaning: word.meaning }] : []}
                                        relatedWord={word.related_word_name}
                                        relationType={word.relation_type}
                                    />

                                ))}
                            </div>
                            {wordCount ? paginationSection : null}
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
