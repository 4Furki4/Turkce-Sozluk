"use client";
import React, { useCallback, useEffect, useRef } from "react";
import { api } from "@/src/trpc/react";
import { Button, ButtonGroup } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { keepPreviousData } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useDebounce } from "@uidotdev/usehooks";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CustomPagination } from "@/src/components/customs/heroui/custom-pagination";
import { CustomTable } from "@/src/components/customs/heroui/custom-table";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomSelect, OptionsMap } from "@/src/components/customs/heroui/custom-select";
import { FilterBar } from "./filter-bar";
import { AlphabetBar } from "./alphabet-bar";
import { WordCard } from "./word-card";
import { ArrowRight, ChevronLeft, ChevronRight, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
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
    const locale = useLocale();
    const filterPanelId = React.useId();
    const resultsId = React.useId();
    const pageJumpId = React.useId();
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

    const { control, watch, setValue, setFocus } = useForm({
        defaultValues: {
            search: initialSearch
        }
    });

    const debouncedSearch = useDebounce(watch("search"), 500);
    const isFirstRender = useRef(true);
    const didInitializeFilterReset = useRef(false);
    const skipNextUrlSync = useRef(false);
    const searchParamsString = searchParams.toString();

    // reset to first page when search changes
    useEffect(() => {
        if (skipNextUrlSync.current) return;

        if (!didInitializeFilterReset.current) {
            didInitializeFilterReset.current = true;
            return;
        }

        setPageNumber(1);
    }, [debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter]);

    // update state on URL param changes (back/forward)
    useEffect(() => {
        if (isFirstRender.current) return;
        skipNextUrlSync.current = true;

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
    }, [searchParamsString, setValue]);

    // sync state to URL, enable back/forward history
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (skipNextUrlSync.current) {
            skipNextUrlSync.current = false;
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
        const nextSearch = params.toString();

        if (nextSearch === searchParamsString) return;

        // The client queries already load these filters. Keep shareable URLs and Back/Forward
        // without triggering a second set of server reads for the same interaction.
        window.history.pushState(null, '', `${pathname}?${nextSearch}`);
    }, [pageNumber, wordsPerPage, debouncedSearch, selectedPos, selectedLang, selectedAttr, sortBy, sortOrder, selectedLetter, viewMode, pathname, searchParamsString]);

    const countQuery = api.word.getWordCount.useQuery({
        search: debouncedSearch,
        partOfSpeechId: selectedPos,
        languageId: selectedLang,
        attributeId: selectedAttr,
        startsWith: selectedLetter || undefined
    })

    const wordCount = countQuery.data;
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

    const { data: filterOptions } = api.word.getFilterOptions.useQuery(undefined, {
        enabled: showAdvancedFilters || activeAdvancedFilterCount > 0,
    });
    const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
    const search = watch('search');
    const hasFilters = Boolean(search || selectedLetter || activeAdvancedFilterCount);
    const isUpdating = wordsQuery.isFetching || countQuery.isFetching;
    const hasQueryError = wordsQuery.isError || countQuery.isError;

    const clearFilters = () => {
        setValue('search', '');
        setSelectedLetter(null);
        setSelectedPos([]);
        setSelectedLang([]);
        setSelectedAttr([]);
        setPageNumber(1);
        setFocus('search');
    };

    const activeFilters = [
        ...(search ? [{ key: 'search', label: t('activeFilters.search', { value: search }), remove: () => setValue('search', '') }] : []),
        ...(selectedLetter ? [{ key: 'letter', label: t('activeFilters.letter', { value: selectedLetter }), remove: () => setSelectedLetter(null) }] : []),
        ...selectedPos.map(id => ({
            key: `pos-${id}`,
            label: `${t('filters.partOfSpeech')}: ${filterOptions?.partOfSpeechs.find(option => String(option.id) === id)?.partOfSpeech ?? id}`,
            remove: () => setSelectedPos(values => values.filter(value => value !== id)),
        })),
        ...selectedLang.map(id => {
            const language = filterOptions?.languages.find(option => String(option.id) === id);
            return {
                key: `lang-${id}`,
                label: `${t('filters.language')}: ${language ? (locale === 'en' ? language.language_en || language.language_tr : language.language_tr) : id}`,
                remove: () => setSelectedLang(values => values.filter(value => value !== id)),
            };
        }),
        ...selectedAttr.map(id => ({
            key: `attr-${id}`,
            label: `${t('filters.attribute')}: ${filterOptions?.attributes.find(option => String(option.id) === id)?.attribute ?? id}`,
            remove: () => setSelectedAttr(values => values.filter(value => value !== id)),
        })),
    ];

    const renderCell = useCallback((item: Row, columnKey: React.Key) => {
        if (columnKey === 'name') {
            return (
                <Link
                    prefetch={false}
                    lang="tr"
                    className="inline-block max-w-full break-words text-base font-semibold leading-snug text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:text-lg"
                    href={{ pathname: '/search/[word]', params: { word: item.name } }}
                >
                    {item.name}
                </Link>
            );
        }
        if (!item.meaning && item.relatedWord) {
            return (
                <span className="text-foreground/75">
                    {t(item.relationType === 'turkish_equivalent' ? 'entry.turkishEquivalent' : 'entry.seeAlso')}{' '}
                    <Link prefetch={false} href={{ pathname: '/search/[word]', params: { word: item.relatedWord } }} className="font-medium text-primary underline-offset-4 hover:underline">
                        {item.relatedWord}
                    </Link>
                </span>
            );
        }
        return item.meaning || <span className="text-foreground/70">{t('entry.noMeaning')}</span>;
    }, [t]);

    const handlePageJump = (e: React.FormEvent) => {
        e.preventDefault();
        const rawPage = Number(pageJumpInput);
        if (!Number.isFinite(rawPage)) return;
        const boundedPage = Math.min(Math.max(1, Math.floor(rawPage)), totalPageNumber ?? 1);
        setPageNumber(boundedPage);
        setPageJumpInput(boundedPage.toString());
    };

    const inputClassNames = {
        inputWrapper: 'h-11 min-h-11 rounded-lg border border-border bg-background/40 shadow-none group-data-[hover=true]:border-primary/60',
        input: 'text-base placeholder:text-foreground/65',
    };
    const selectClassNames = {
        base: 'min-w-0',
        trigger: 'h-11 min-h-11 rounded-lg border border-border bg-background/40 px-3 shadow-none',
        value: 'text-sm text-foreground',
        popoverContent: 'min-w-[220px]',
    };

    const getPageLabel = (value?: string | number) => {
        if (value === 'prev') return t('pagination.previous');
        if (value === 'next') return t('pagination.next');
        if (value === 'dots') return t('pagination.more');
        return t('pagination.page', { page: String(value) });
    };

    const paginationSection = (
        <footer className="flex flex-col gap-3 border-t border-border pt-4 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-center text-sm tabular-nums text-foreground/75 sm:text-left">
                {wordCount !== undefined && !countQuery.isError ? <>
                    <span className="sm:hidden">{t('pagination.mobileSummary', {
                        from: formatNumber(startWord), to: formatNumber(endWord), total: formatNumber(totalWords),
                    })}</span>
                    <span className="hidden sm:inline">{t('pagination.summary', {
                        from: formatNumber(startWord), to: formatNumber(endWord), total: formatNumber(totalWords),
                    })}</span>
                </> : t('results.countUnavailable')}
            </p>
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                <nav aria-label={t('pagination.label')} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:hidden">
                    <Button
                        aria-label={t('pagination.previous')}
                        isDisabled={pageNumber <= 1}
                        onPress={() => setPageNumber(page => Math.max(1, page - 1))}
                        variant="bordered"
                        className="h-11 min-w-11 gap-1 justify-self-start rounded-lg border border-border bg-background/40 px-2 text-sm"
                        startContent={<ChevronLeft size={16} aria-hidden="true" />}
                    >
                        <span className="hidden min-[360px]:inline">{t('pagination.previousShort')}</span>
                    </Button>
                    <span className="whitespace-nowrap text-sm tabular-nums">
                        <span className="sr-only">{t('pagination.position', { page: formatNumber(pageNumber), total: formatNumber(totalPageNumber ?? 1) })}</span>
                        <span aria-hidden="true">
                            <span className="font-semibold">{formatNumber(pageNumber)}</span>
                            <span className="mx-1 text-foreground/60">/</span>
                            <span className="text-foreground/75">{formatNumber(totalPageNumber ?? 1)}</span>
                        </span>
                    </span>
                    <Button
                        aria-label={t('pagination.next')}
                        isDisabled={!totalPageNumber || pageNumber >= totalPageNumber}
                        onPress={() => setPageNumber(page => Math.min(totalPageNumber ?? 1, page + 1))}
                        variant="bordered"
                        className="h-11 min-w-11 gap-1 justify-self-end rounded-lg border border-border bg-background/40 px-2 text-sm"
                        endContent={<ChevronRight size={16} aria-hidden="true" />}
                    >
                        <span className="hidden min-[360px]:inline">{t('pagination.nextShort')}</span>
                    </Button>
                </nav>
                <CustomPagination
                    className="hidden sm:block"
                    aria-label={t('pagination.label')}
                    total={totalPageNumber ?? 1}
                    page={pageNumber}
                    siblings={0}
                    boundaries={1}
                    disableCursorAnimation
                    classNames={{ wrapper: 'max-w-full flex-wrap justify-center gap-y-1' }}
                    getItemAriaLabel={getPageLabel}
                    renderItem={({ key, value, children, isActive, onPress, ref }) => (
                        <li key={key}>
                            <Button
                                ref={ref as React.Ref<HTMLButtonElement>}
                                isIconOnly
                                radius="sm"
                                className="h-11 min-w-11 font-medium tabular-nums"
                                color={isActive ? 'primary' : 'default'}
                                variant={isActive ? 'solid' : 'light'}
                                aria-label={getPageLabel(value)}
                                aria-current={isActive ? 'page' : undefined}
                                isDisabled={(value === 'prev' && pageNumber === 1) || (value === 'next' && pageNumber === totalPageNumber)}
                                onPress={onPress}
                            >
                                {children}
                            </Button>
                        </li>
                    )}
                    onChange={setPageNumber}
                />
                <div className="grid min-w-0 grid-cols-2 items-end gap-3 sm:flex sm:items-center sm:gap-2">
                    <div className="min-w-0 space-y-1 sm:space-y-0">
                        <p aria-hidden="true" className="text-xs font-medium leading-5 text-foreground/75 sm:hidden">{t('wordsPerPage')}</p>
                        <CustomSelect
                            aria-label={t('wordsPerPage')}
                            options={wordsPerPageSelectOptions}
                            selectedKeys={[wordsPerPage.toString()]}
                            renderValue={items => <span>{items[0]?.textValue}<span className="hidden sm:inline"> / {t('pagination.perPage')}</span></span>}
                            className="w-full sm:w-32"
                            classNames={selectClassNames}
                            onChange={e => {
                                if (!e.target.value) return;
                                setWordsPerPage(Number(e.target.value));
                                setPageNumber(1);
                            }}
                        />
                    </div>
                    <form onSubmit={handlePageJump} className="min-w-0 space-y-1 sm:space-y-0">
                        <label htmlFor={pageJumpId} className="block text-xs font-medium leading-5 text-foreground/75 sm:sr-only">{t('pagination.jumpTo')}</label>
                        <div className="flex items-center gap-1">
                            <CustomInput
                                id={pageJumpId}
                                aria-label={t('pagination.jumpTo')}
                                type="number"
                                inputMode="numeric"
                                enterKeyHint="go"
                                min={1}
                                max={totalPageNumber ?? 1}
                                value={pageJumpInput}
                                onValueChange={setPageJumpInput}
                                className="min-w-0 flex-1 sm:w-16 sm:flex-none"
                                classNames={{ ...inputClassNames, input: `${inputClassNames.input} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none` }}
                            />
                            <Button type="submit" className="h-11 min-w-11 rounded-lg px-3" color="primary" variant="flat">{t('pagination.go')}</Button>
                        </div>
                    </form>
                </div>
            </div>
        </footer>
    );

    return (
        <section className="word-list-enhanced space-y-5" aria-labelledby="word-list-title">
            <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div>
                    <h1 id="word-list-title" className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{t('title')}</h1>
                    <p role="status" aria-atomic="true" className="mt-2 text-sm tabular-nums text-foreground/75">
                        {countQuery.isError ? t('results.countUnavailable') : wordCount === undefined ? t('results.loading') : t('results.count', { count: formatNumber(wordCount) })}
                        {isUpdating && wordCount !== undefined ? <span className="ml-2">{t('results.updating')}</span> : null}
                    </p>
                </div>
                <Link href="/words" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    {t('indexLink')}<ArrowRight size={16} aria-hidden="true" />
                </Link>
            </header>

            <div className="space-y-3">
                <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <Controller name="search" control={control} render={({ field }) => (
                        <CustomInput
                            {...field}
                            aria-label={t('searchPlaceholder')}
                            type="search"
                            placeholder={t('searchPlaceholder')}
                            classNames={inputClassNames}
                            startContent={<Search size={18} className="shrink-0 text-foreground/65" aria-hidden="true" />}
                        />
                    )} />
                    <div className="flex min-w-0 items-center gap-2">
                        <CustomSelect
                            aria-label={t('sorting.label')}
                            options={sortOptions}
                            className="min-w-0 flex-1 lg:w-56 lg:flex-none"
                            classNames={selectClassNames}
                            selectedKeys={[`${sortBy}-${sortOrder}`]}
                            onChange={e => {
                                if (!e.target.value) return;
                                const [sort, order] = e.target.value.split('-');
                                setSortBy(sort as typeof sortBy);
                                setSortOrder(order as typeof sortOrder);
                            }}
                        />
                        <Button
                            className="h-11 min-w-11 gap-1.5 px-3"
                            variant="flat"
                            aria-label={showAdvancedFilters ? t('advancedFilters.hide') : t('advancedFilters.show')}
                            aria-expanded={showAdvancedFilters}
                            aria-controls={filterPanelId}
                            onPress={() => setShowAdvancedFilters(value => !value)}
                            startContent={<SlidersHorizontal size={17} aria-hidden="true" />}
                        >
                            <span className="hidden sm:inline">{t('advancedFilters.short')}</span>
                            {activeAdvancedFilterCount > 0 ? <span className="tabular-nums">{activeAdvancedFilterCount}</span> : null}
                        </Button>
                        <ButtonGroup aria-label={t('view.label')} className="shrink-0">
                            {(['list', 'grid'] as const).map(mode => (
                                <Button
                                    key={mode}
                                    isIconOnly
                                    className="h-11 min-w-11"
                                    aria-label={t(`view.${mode}`)}
                                    aria-pressed={viewMode === mode}
                                    aria-controls={resultsId}
                                    color={viewMode === mode ? 'primary' : 'default'}
                                    variant={viewMode === mode ? 'solid' : 'light'}
                                    onPress={() => setViewMode(mode)}
                                >
                                    {mode === 'list' ? <List size={18} aria-hidden="true" /> : <LayoutGrid size={18} aria-hidden="true" />}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>
                </div>
                <div id={filterPanelId} hidden={!showAdvancedFilters}>
                    {showAdvancedFilters ? <FilterBar selectedPos={selectedPos} selectedLang={selectedLang} selectedAttr={selectedAttr} onPosChange={setSelectedPos} onLangChange={setSelectedLang} onAttrChange={setSelectedAttr} /> : null}
                </div>
                <AlphabetBar selectedLetter={selectedLetter} onLetterSelect={setSelectedLetter} />
                {hasFilters ? (
                    <div aria-label={t('activeFilters.label')} className="flex flex-wrap items-center gap-2">
                        {activeFilters.map(filter => (
                            <Button key={filter.key} variant="flat" className="h-auto min-h-11 max-w-full gap-2 px-3 py-2 text-sm" aria-label={t('activeFilters.remove', { label: filter.label })} onPress={filter.remove}>
                                <span className="min-w-0 break-words whitespace-normal text-left">{filter.label}</span><X size={14} className="shrink-0" aria-hidden="true" />
                            </Button>
                        ))}
                        <Button variant="light" className="min-h-11 text-sm underline underline-offset-4" onPress={clearFilters}>{t('activeFilters.clear')}</Button>
                    </div>
                ) : null}
            </div>

            {hasQueryError ? (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background/40 p-4">
                    <div><p className="font-medium">{t('results.errorTitle')}</p><p className="mt-1 text-sm text-foreground/75">{t('results.errorDescription')}</p></div>
                    <Button variant="flat" className="min-h-11" isLoading={isUpdating} onPress={() => { void Promise.all([wordsQuery.refetch(), countQuery.refetch()]); }}>{t('results.retry')}</Button>
                </div>
            ) : null}

            <div id={resultsId} aria-busy={wordsQuery.isFetching} className="min-w-0">
                {viewMode === 'list' ? (
                    <CustomTable
                        aria-label={t('results.tableLabel')}
                        columns={columns}
                        items={rows}
                        renderCell={renderCell}
                        isCompact={false}
                        isStriped={false}
                        removeWrapper
                        loadingState={wordsQuery.isFetching ? 'loading' : 'idle'}
                        classNames={{
                            base: 'min-h-0',
                            table: 'table-fixed',
                            thead: 'hidden sm:table-header-group',
                            th: 'border-b border-border bg-background/40 px-4 py-3 text-sm font-medium text-foreground/75 first:w-1/3',
                            tr: 'grid grid-cols-1 border-b border-border/70 bg-background/40 last:border-0 sm:table-row',
                            td: 'block break-words px-4 py-3 text-base leading-relaxed text-foreground/85 first:pb-0 group-data-[odd=true]/tr:before:bg-transparent sm:table-cell sm:first:pb-3',
                        }}
                        emptyContent={wordsQuery.isError ? <span /> : (
                            <div className="py-10 text-center">
                                <p className="text-lg font-semibold text-foreground">{t('results.emptyTitle')}</p>
                                <p className="mx-auto mt-2 max-w-md text-sm text-foreground/75">{t(hasFilters ? 'results.emptyFiltered' : 'results.emptyDescription')}</p>
                                {hasFilters ? <Button className="mt-4 min-h-11" variant="flat" onPress={clearFilters}>{t('activeFilters.clear')}</Button> : null}
                            </div>
                        )}
                    />
                ) : wordsQuery.isPending ? (
                    <div role="status" aria-label={t('results.loading')} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: wordsPerPage }).map((_, index) => <WordCardSkeleton key={index} />)}
                    </div>
                ) : rows.length ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {wordsQuery.data?.map(word => <WordCard key={word.word_id} id={word.word_id.toString()} name={word.name} meanings={word.meaning ? [{ id: '1', meaning: word.meaning }] : []} relatedWord={word.related_word_name} relationType={word.relation_type} />)}
                    </div>
                ) : !wordsQuery.isError ? (
                    <div className="rounded-xl bg-background/40 px-4 py-10 text-center">
                        <p className="text-lg font-semibold">{t('results.emptyTitle')}</p>
                        <p className="mt-2 text-sm text-foreground/75">{t(hasFilters ? 'results.emptyFiltered' : 'results.emptyDescription')}</p>
                        {hasFilters ? <Button className="mt-4 min-h-11" variant="flat" onPress={clearFilters}>{t('activeFilters.clear')}</Button> : null}
                    </div>
                ) : null}
            </div>
            {rows.length > 0 ? paginationSection : null}
        </section>
    );
}
