"use client"
import { meaningInputClasses } from "./field-styles";
import { WordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { useTranslations } from 'next-intl';

export default function MeaningExampleSentenceInput({
    index,
    control,
}: {
    index: number,
    control: Control<WordForm>,
}) {
    const t = useTranslations();
    return (
        <Controller
            name={`meanings.${index}.example.sentence`}
            control={control}
            render={({ field }) => (
                <>
                    <Input
                        {...field}
                        radius='md'
                        label={t('ExampleSentence')}
                        labelPlacement='outside-top'
                        size='lg'
                        classNames={meaningInputClasses}
                        description={t('Forms.ExampleSentence.Description')}
                    />
                </>
            )}
        />
    )
}
