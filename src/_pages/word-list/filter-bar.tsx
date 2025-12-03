"use client";

import React from "react";
import { api } from "@/src/trpc/react";
import { CustomMultiSelect, OptionsMap } from "@/src/components/customs/heroui/custom-multi-select";
import { useTranslations, useLocale } from "next-intl";
import { Skeleton } from "@heroui/react";

interface FilterBarProps {
    selectedPos: string[];
    selectedLang: string[];
    selectedAttr: string[];
    onPosChange: (keys: string[]) => void;
    onLangChange: (keys: string[]) => void;
    onAttrChange: (keys: string[]) => void;
}

export function FilterBar({
    selectedPos,
    selectedLang,
    selectedAttr,
    onPosChange,
    onLangChange,
    onAttrChange
}: FilterBarProps) {
    const t = useTranslations('WordList');
    const locale = useLocale();

    const { data: filterOptions, isLoading } = api.word.getFilterOptions.useQuery();

    if (isLoading) {
        return (
            <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Skeleton className="rounded-lg w-full sm:w-1/3 h-14" />
                <Skeleton className="rounded-lg w-full sm:w-1/3 h-14" />
                <Skeleton className="rounded-lg w-full sm:w-1/3 h-14" />
            </div>
        );
    }

    const posOptions: OptionsMap = {};
    filterOptions?.partOfSpeechs.forEach(pos => {
        posOptions[pos.id.toString()] = pos.partOfSpeech;
    });

    const langOptions: OptionsMap = {};
    filterOptions?.languages.forEach(lang => {
        // Choose label based on locale, fallback to Turkish if English is missing or vice versa
        const label = locale === 'en' ? (lang.language_en || lang.language_tr) : lang.language_tr;
        langOptions[lang.id.toString()] = label;
    });

    const attrOptions: OptionsMap = {};
    filterOptions?.attributes.forEach(attr => {
        attrOptions[attr.id.toString()] = attr.attribute;
    });

    return (
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <CustomMultiSelect
                size="md"
                options={posOptions}
                placeholder={t('filters.partOfSpeech')}
                selectedKeys={selectedPos}
                onSelectionChange={onPosChange}
                onClear={() => onPosChange([])}
            />
            <CustomMultiSelect
                size="md"
                options={langOptions}
                placeholder={t('filters.language')}
                selectedKeys={selectedLang}
                onSelectionChange={onLangChange}
                onClear={() => onLangChange([])}
            />
            <CustomMultiSelect
                size="md"
                options={attrOptions}
                placeholder={t('filters.attribute')}
                selectedKeys={selectedAttr}
                onSelectionChange={onAttrChange}
                onClear={() => onAttrChange([])}
            />
        </div>
    );
}
