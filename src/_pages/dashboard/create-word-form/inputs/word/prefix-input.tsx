"use client"
import { WordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { useTranslations } from 'next-intl';

export default function WordPrefixInput({
    control
}: {
    control: Control<WordForm>
}) {
    const t = useTranslations();
    return (
        <Controller
            control={control}
            name="prefix"
            render={({ field }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('Prefix')}
                    labelPlacement='outside'
                    description={t('PrefixIsOptional')}
                    placeholder={t('EnterPrefix')}
                />
            )}
        />
    )
}
