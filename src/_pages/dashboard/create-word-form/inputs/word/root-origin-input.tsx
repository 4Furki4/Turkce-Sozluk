"use client"
import { WordForm } from '@/types';
import { Input } from "@heroui/react";
import { useTranslations } from 'next-intl';
import React from 'react'
import { Control, Controller, UseFormClearErrors, UseFormGetFieldState, UseFormSetError, UseFormWatch } from 'react-hook-form';

export default function WordRootOriginInput({
    control,
    watch,
    setError,
    clearErrors,
    getFieldState,
}: {
    control: Control<WordForm>,
    watch: UseFormWatch<WordForm>,
    setError: UseFormSetError<WordForm>,
    clearErrors: UseFormClearErrors<WordForm>,
    getFieldState: UseFormGetFieldState<WordForm>
}) {
    const t = useTranslations()
    return (
        <Controller
            control={control}
            name="root"
            rules={{
                validate: (value) => {
                    if (
                        watch("language") &&
                        !value &&
                        getFieldState("root").isTouched
                    ) {
                        return t("Forms.Root.InputError");
                    } else if (!watch("language") && value) {
                        setError("language", {
                            message: t("Forms.Root.LanguageInputError")
                        });
                        return true;
                    } else {
                        clearErrors("language");
                        return true;
                    }
                },
            }}
            render={({ field, fieldState: { error } }) => (
                <Input
                    {...field}
                    radius='md'
                    label={t('Root')}
                    placeholder={t('EnterRoot')}
                    labelPlacement='outside'
                    description={t('EnterRoot')}
                    errorMessage={error?.message}
                    isInvalid={error !== undefined}
                />
            )}
        />
    )
}
