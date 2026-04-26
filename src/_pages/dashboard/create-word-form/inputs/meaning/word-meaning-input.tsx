"use client"
import { WordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { useTranslations } from 'next-intl';
export default function WordMeaningInput({
    index,
    control,

}: {
    index: number,
    control: Control<WordForm>,
}) {
    const t = useTranslations();
    return (
        <Controller
            name={`meanings.${index}.meaning`}
            control={control}
            rules={{
                required: {
                    value: true,
                    message: t('Forms.Meanings.Required'),
                },
            }}
            render={({ field, fieldState: { error } }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('Meaning')}
                    labelPlacement='outside'
                    description={t('Forms.Meanings.Required')}
                    isRequired
                    errorMessage={error?.message}
                    isInvalid={error !== undefined}
                />
            )}
        />
    )
}
