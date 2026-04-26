"use client"
import { WordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { useTranslations } from 'next-intl';

export default function WordSuffixInput({
    control
}: {
    control: Control<WordForm>
}) {
    const t = useTranslations();
    return (
        <Controller
            control={control}
            name="suffix"
            render={({ field }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('Suffix')}
                    placeholder={t('EnterSuffix')}
                    labelPlacement='outside'
                    description={t('SuffixIsOptional')}
                />
            )}
        />
    )
}
