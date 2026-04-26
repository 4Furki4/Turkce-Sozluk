import React from 'react'
import { Control, Controller } from 'react-hook-form'
import { Select, SelectItem } from '@heroui/react'
import { MeaningEditRequestForm } from '../meanings-edit-request'
import { useTranslations } from 'next-intl'
export default function MeaningAttributesInput({ control, meaningAttributes, meaningAttributesIsLoading }:
    {
        control: Control<MeaningEditRequestForm>,
        meaningAttributes: {
            id: string;
            attribute: string;
        }[] | undefined,
        meaningAttributesIsLoading: boolean
    }) {
    const t = useTranslations()
    return (
        <Controller
            name={`attributes`}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Select
                    as={'div'}
                    items={meaningAttributes || []}
                    radius='md'
                    label={t("Attributes")}
                    placeholder={t("YouCanSelectAnAttributeForThisMeaning")}
                    selectionMode="multiple"
                    isLoading={meaningAttributesIsLoading}
                    selectedKeys={new Set(value)}
                    onSelectionChange={(keys) => {
                        onChange(Array.from(keys))
                    }}
                    isInvalid={!!error}
                    errorMessage={error?.message}
                    className="w-full"
                >
                    {(attr) => (
                        <SelectItem key={attr.id.toString()} >
                            {attr.attribute}
                        </SelectItem>
                    )}
                </Select>
            )}
        />
    )
}
