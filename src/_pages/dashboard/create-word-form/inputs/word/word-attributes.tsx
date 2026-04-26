"use client"
import AddWordAttributeModal from '@/src/components/customs/modals/add-word-attribute'
import { api } from '@/src/trpc/react'
import { WordForm } from '@/types'
import { Button, Select, Selection, SelectItem, useDisclosure } from "@heroui/react"
import { Plus, X } from 'lucide-react'
import React from 'react'
import { Control, Controller, UseFormSetValue } from 'react-hook-form'
import { useTranslations } from 'next-intl';

export default function WordAttributesInput({
    control,
    setValue: setFieldValue
}: {
    control: Control<WordForm>,
    setValue: UseFormSetValue<WordForm>
}) {
    const t = useTranslations();
    const [wordAttributes] = api.params.getWordAttributes.useSuspenseQuery()
    const [values, setValues] = React.useState<Selection>(new Set([]));

    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAttributes = e.target.value.split(",")
        setValues(() => new Set(selectedAttributes))
        setFieldValue("attributes", selectedAttributes)
    };
    const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure()
    return (
        <>
            <AddWordAttributeModal isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange} />
            <Controller
                name={`attributes`}
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <Select
                        classNames={{
                            trigger: "pl-1",
                        }}
                        radius='md'
                        as={'div'}
                        tabIndex={0}
                        placeholder={t('SelectAttributes')}
                        label={t('Attributes')}
                        labelPlacement='outside'
                        selectedKeys={values}
                        isInvalid={error !== undefined} errorMessage={error?.message}
                        {...field}
                        onChange={handleSelectionChange}
                        startContent={(
                            <Button
                                variant='light'
                                isIconOnly
                                color='danger'
                                onPress={() => {
                                    setValues(new Set([]));
                                    setFieldValue("attributes", [])
                                }}
                            >
                                <X aria-description={t('ResetAllSelectedValuesButton')} />
                                <div className='sr-only'>
                                    {t('ResetAllSelectedValuesButton')}
                                </div>
                            </Button>
                        )}
                        endContent={(
                            <Button
                                isIconOnly
                                onPress={onOpen}
                                variant='light'
                            >
                                <Plus></Plus>
                                <div className='sr-only'>
                                    {t('AddNewWordAttribute')}
                                </div>
                            </Button>
                        )}
                        selectionMode='multiple'>
                        {wordAttributes?.map((wordAttribute => (
                            <SelectItem key={wordAttribute.id}>
                                {wordAttribute.attribute}
                            </SelectItem>
                        ))) ?? []}
                    </Select>
                )
                }
            />
        </>
    )
}
