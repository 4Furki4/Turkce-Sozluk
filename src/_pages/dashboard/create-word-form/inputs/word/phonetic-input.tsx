"use client"
import { WordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { useTranslations } from 'next-intl';
import { Control, Controller } from 'react-hook-form'

export default function WordPhoneticInput({
    control
}: {
    control: Control<WordForm>
}) {
    const t = useTranslations();
    return (
        <Controller
            control={control}
            name="phonetic"
            render={({ field, fieldState: { error } }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('Phonetic')}
                    placeholder={t('EnterPhonetic')}
                    labelPlacement='outside'
                    description={t('EnterPhonetic')}
                />
            )}
        />
    )
}
