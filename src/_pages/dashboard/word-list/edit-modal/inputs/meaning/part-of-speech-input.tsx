"use client"
import { EditWordForm } from '@/types'
import { Select, Selection, SelectItem } from "@heroui/react"
import React from 'react'
import { Control, Controller, UseFormSetValue } from 'react-hook-form'
import { useTranslations } from 'next-intl'
export default function PartOfSpeechInput({
    control,
    index,
    partOfSpeeches,
    selectedPartOfSpeechId,
    setFieldValue
}: {
    control: Control<EditWordForm>,
    index: number,
    partOfSpeeches: {
        id: string;
        partOfSpeech: string;
    }[],
    selectedPartOfSpeechId: string | undefined
    setFieldValue: UseFormSetValue<EditWordForm>
}) {
    const t = useTranslations()
    const [value, setValue] = React.useState<Selection>(new Set([selectedPartOfSpeechId?.toString() ?? '']));
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAttribute = e.target.value
        setValue(() => new Set([selectedAttribute]))
        setFieldValue(`meanings.${index}.partOfSpeechId`, selectedAttribute)
    };
    return (
        <Controller control={control} name={`meanings.${index}.partOfSpeechId`}
            render={({ field, formState: { errors } }) => (
                <Select
                    items={partOfSpeeches}
                    selectionMode='single'
                    {...field}
                    selectedKeys={value}
                    onChange={handleSelectionChange}
                    radius='md'
                    label={t("PartOfSpeech")}
                    labelPlacement='outside'
                    isRequired
                    disallowEmptySelection
                    required={false}
                    isInvalid={errors.meanings ? !!errors.meanings[index]?.partOfSpeechId : undefined}
                    errorMessage={errors.meanings ? errors.meanings[index]?.partOfSpeechId?.message : undefined}
                >
                    {partOfSpeeches.map((key) => (
                        <SelectItem key={key.id} >
                            {key.partOfSpeech}
                        </SelectItem>
                    ))}
                </Select>
            )} />
    )
}
