"use client"
import { EditWordForm, Language } from '@/types'
import { Autocomplete, AutocompleteItem } from "@heroui/react"
import React from 'react'
import { Control, Controller, UseFormSetValue } from 'react-hook-form'

export default function WordLanguageInput({
    control,
    languages,
    selectedLanguage,
    setFieldValue
}: {
    control: Control<EditWordForm>,
    languages: Language[],
    selectedLanguage: string,
    setFieldValue: UseFormSetValue<EditWordForm>
}) {
    return (
        <Controller name='language' control={control}
            render={({ field, fieldState: { error } }) => (
                <Autocomplete
                    radius='md'
                    {...field}
                    label="Language"
                    labelPlacement='outside'
                    placeholder="Select Language"
                    defaultSelectedKey={selectedLanguage}
                    onSelectionChange={(item) => {
                        field.onChange(item);
                        setFieldValue("language", item as string)
                    }}
                    isInvalid={error !== undefined}
                    errorMessage={error?.message}
                >
                    {languages.map((lang) => (
                        <AutocompleteItem key={lang.language_code} >
                            {lang.language_en}
                            {/* TODO: i18n needed */}
                        </AutocompleteItem>
                    ))}
                </Autocomplete>
            )} />
    )
}
