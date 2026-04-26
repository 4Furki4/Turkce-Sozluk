"use client"
import { Meaning, WordForm } from '@/types';
import { Button, ButtonGroup } from "@heroui/react";
import React from 'react'
import { UseFieldArrayAppend, UseFieldArrayPrepend } from 'react-hook-form';
import { useTranslations } from 'next-intl';

export default function MeaningFieldArrayButtons({
    append,
    prepend,
    meaningDefaultValues
}: {
    append: UseFieldArrayAppend<WordForm>,
    prepend: UseFieldArrayPrepend<WordForm>,
    meaningDefaultValues: Partial<Meaning>
}) {
    const t = useTranslations();
    return (
        <ButtonGroup radius='md' className="w-full flex  gap-2 ">
            <Button
                radius='md'
                className="w-full"
                type="button"
                onPress={() => {
                    append(meaningDefaultValues);
                }}
            >
                {t('Dashboard.Append')}
            </Button>
            <Button
                radius='md'
                className="w-full"
                type="button"
                onPress={() => {
                    prepend(meaningDefaultValues);
                }}
            >
                {t('Dashboard.Prepend')}
            </Button>
        </ButtonGroup>
    )
}
