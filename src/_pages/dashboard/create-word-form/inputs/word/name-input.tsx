"use client"
import { WordForm } from '@/types';
import { Input } from "@heroui/react";
import React from 'react'
import { Control, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';

export default function WordNameInput({
    control,
}: {
    control: Control<WordForm>,
}) {
    const t = useTranslations();
    return (
        <Controller
            control={control}
            name="name"
            rules={{
                required: {
                    value: true,
                    message: t('Forms.WordName.Required'),
                },
            }}
            render={({ field, fieldState: { error } }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('WordName')}
                    placeholder={t('EnterWordName')}
                    labelPlacement='outside'
                    description={error ? t('Forms.WordName.Required') : undefined}
                    errorMessage={error?.message}
                    isInvalid={error !== undefined}
                    isRequired
                />
            )}
        />
    )
}
