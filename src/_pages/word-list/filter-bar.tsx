"use client";

import React from "react";
import { api } from "@/src/trpc/react";
import { CustomMultiSelect, OptionsMap } from "@/src/components/customs/heroui/custom-multi-select";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface FilterBarProps {
    selectedPos: string[];
    selectedLang: string[];
    selectedAttr: string[];
    onPosChange: (keys: string[]) => void;
    onLangChange: (keys: string[]) => void;
    onAttrChange: (keys: string[]) => void;
    className?: string;
}

export function FilterBar({
    selectedPos,
    selectedLang,
    selectedAttr,
    onPosChange,
    onLangChange,
    onAttrChange,
    className,
}: FilterBarProps) {
    const t = useTranslations('WordList');
    const locale = useLocale();

    const { data: filterOptions, isLoading } = api.word.getFilterOptions.useQuery();

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
        <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full", className)}>
            <CustomMultiSelect
                isLoading={isLoading}
                size="md"
                options={posOptions}
                placeholder={t('filters.partOfSpeech')}
                label={t('filters.partOfSpeech')}
                selectedKeys={selectedPos}
                onSelectionChange={onPosChange}
                onClear={() => onPosChange([])}
            />
            <CustomMultiSelect
                isLoading={isLoading}
                options={langOptions}
                size="md"
                placeholder={t('filters.language')}
                label={t('filters.language')}
                selectedKeys={selectedLang}
                onSelectionChange={onLangChange}
                onClear={() => onLangChange([])}
            />
            <CustomMultiSelect
                isLoading={isLoading}
                size="md"
                options={attrOptions}
                placeholder={t('filters.attribute')}
                label={t('filters.attribute')}
                selectedKeys={selectedAttr}
                onSelectionChange={onAttrChange}
                onClear={() => onAttrChange([])}
            />
        </div>
    );
}
