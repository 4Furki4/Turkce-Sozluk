import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { Select, SelectItem } from '@heroui/react'
import { MeaningEditRequestForm } from './meaning-form-types'
import { useTranslations } from 'next-intl'

export default function PartOfSpeechInput({ control, partOfSpeeches, meaningPartOfSpeechIsLoading }:
    {
        control: Control<MeaningEditRequestForm>,
        partOfSpeeches: {
            id: string;
            partOfSpeech: string;
        }[] | undefined,
        meaningPartOfSpeechIsLoading: boolean
    }) {
    const t = useTranslations()
    return (
        <Controller
            name="partOfSpeechId"
            control={control}
            render={({ field, fieldState: { error } }) => {
                const { value, ...fieldProps } = field;
                return (
                    <Select
                        {...fieldProps}
                        items={partOfSpeeches || []}
                        selectedKeys={value?.toString() ? new Set([value.toString()]) : new Set()}
                        isLoading={meaningPartOfSpeechIsLoading}
                        label={t("PartOfSpeech")}
                        placeholder={t("Forms.PartOfSpeech.Select")}
                        isInvalid={!!error}
                        errorMessage={error?.message}
                        className="w-full"
                    >
                        {(pos) => (
                            <SelectItem key={pos.id.toString()} >
                                {pos.partOfSpeech}
                            </SelectItem>
                        )}
                    </Select>
                )
            }}
        />
    )
}
