"use client"
import { Select, SelectItem } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { WordForm } from '@/types';
import { useTranslations } from "next-intl";
export default function MeaningPartOfSpeechInput({
    index,
    control,
    partOfSpeeches
}: {
    index: number,
    control: Control<WordForm>,
    partOfSpeeches: {
        id: number;
        partOfSpeech: string;
    }[]
}) {
    const t = useTranslations();
    return (
        <Controller
            name={`meanings.${index}.partOfSpeechId`}
            control={control}
            render={({ field, fieldState: { error, isDirty } }) => (
                <Select
                    label={t('PartOfSpeech')}
                    labelPlacement='outside'
                    description={t('Forms.PartOfSpeech.Description')}
                    placeholder={t('Forms.PartOfSpeech.Select')}
                    isInvalid={error !== undefined && isDirty}
                    errorMessage={isDirty && error?.message}
                    {...field}
                    onChange={(e) => {
                        field.onChange(parseInt(e.target.value)) // Convert string to number to override react-hook-form behavior
                    }}
                    radius='md'
                    classNames={{
                        listboxWrapper: 'rounded-md',
                        popoverContent: 'rounded-md',
                        base: 'rounded-md',
                    }}
                >
                    {partOfSpeeches.map((key) => (
                        <SelectItem key={key.id}>
                            {key.partOfSpeech}
                        </SelectItem>
                    ))}
                </Select>
            )}
        />
    )
}
