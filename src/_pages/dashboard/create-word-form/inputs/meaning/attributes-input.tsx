"use client"
import { meaningSelectClasses } from "./field-styles";
import AddMeaningAttributeModal from '@/src/components/customs/modals/add-meaning-attribute-inline';
import { api } from '@/src/trpc/react';
import { WordForm } from '@/types'
import { Button, Select, Selection, SelectItem, useDisclosure } from "@heroui/react"
import { Plus, X } from 'lucide-react';
import React from 'react'
import { Control, Controller, UseFormSetValue } from 'react-hook-form'
import { useTranslations } from 'next-intl';
export default function MeaningAttributesInput({
    index,
    control,
    meaningAttributes,
    setFieldValue
}: {
    index: number,
    control: Control<WordForm>,
    meaningAttributes: {
        id: number;
        attribute: string;
    }[],
    setFieldValue: UseFormSetValue<WordForm>
}) {
    const t = useTranslations();
    const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure()
    const [values, setValues] = React.useState<Selection>(new Set([]));
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAttributes = e.target.value.split(",").filter((val) => val)
        setValues(() => new Set(selectedAttributes))
        setFieldValue(`meanings.${index}.attributes`, selectedAttributes, { shouldDirty: true, shouldValidate: true })
    };
    const { data, isLoading } = api.params.getMeaningAttributes.useQuery(undefined, {
        initialData: meaningAttributes
    })
    return (
        <>
            <AddMeaningAttributeModal isOpen={isOpen} onOpenChange={onOpenChange} onClose={onClose} />
            <Controller
                name={`meanings.${index}.attributes`}
                control={control}
                rules={{
                    min: {
                        value: 1,
                        message: "Please select at least one attribute"
                    }
                }}
                render={({ field, fieldState: { error } }) => (
                    <Select {...field}
                        as={'div'}
                        tabIndex={0}
                        radius='md'
                        label={t('Attributes')}
                        classNames={{ ...meaningSelectClasses, trigger: "h-12 min-h-12 pl-1" }}
                        labelPlacement='outside-top'
                        size='lg'
                        description={t('Forms.MeaningAttributes.Description')}
                        placeholder={t('Forms.MeaningAttributes.Select')}
                        selectionMode='multiple'
                        onChange={handleSelectionChange}
                        isLoading={isLoading}
                        selectedKeys={field.value ?? []}
                        startContent={(
                            <Button
                                variant='light'
                                isIconOnly
                                color='danger'
                                onPress={() => {
                                    setValues(new Set([]));
                                    setFieldValue(`meanings.${index}.attributes`, [], { shouldDirty: true, shouldValidate: true })
                                }}
                            >
                                <X aria-description='Reset all selected values button' />
                                <div className='sr-only'>
                                    Reset selected values
                                </div>
                            </Button>

                        )}
                        endContent={(
                            <Button
                                isIconOnly
                                onPress={onOpen}
                                variant='light'
                            // color='primary'
                            >
                                <div className='sr-only'>
                                    {t('AddNewWordAttribute')}
                                </div>
                                <Plus></Plus>
                            </Button>
                        )}
                    >
                        {data.map((attribute) => (
                            <SelectItem key={attribute.id}>
                                {attribute.attribute}
                            </SelectItem>
                        ))}
                    </Select>
                )}
            />
        </>
    )
}
