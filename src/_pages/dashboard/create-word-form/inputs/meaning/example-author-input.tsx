"use client"
import AddAuthorModal from '@/src/components/customs/modals/add-author';
import { api } from '@/src/trpc/react';
import { WordForm } from '@/types'
import { Button, Select, Selection, SelectItem, useDisclosure } from "@heroui/react"
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react'
import { Control, Controller, UseFormClearErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'

export default function MeaningExampleSentenceAuthorInput({
    index,
    control,
    defaultExampleSentenceAuthors,
    clearErrors,
    watch,
    setFieldValue
}: {
    index: number,
    control: Control<WordForm>,
    defaultExampleSentenceAuthors: {
        id: string;
        name: string;
    }[],
    clearErrors: UseFormClearErrors<WordForm>,
    watch: UseFormWatch<WordForm>,
    setFieldValue: UseFormSetValue<WordForm>
}) {
    const t = useTranslations();
    const { isOpen, onOpenChange, onOpen, onClose } = useDisclosure()
    const [value, setValue] = React.useState<Selection>(new Set());
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedAuthor = e.target.value
        setValue(() => new Set(selectedAuthor))
        setFieldValue(`meanings.${index}.example.author`, selectedAuthor)
    };
    const { data } = api.params.getExampleSentenceAuthors.useQuery(undefined, {
        initialData: defaultExampleSentenceAuthors
    });
    return (
        <Controller
            control={control} name={`meanings.${index}.example.author`}
            rules={{
                validate: (author) => {
                    const exampleSentenceFormName = `meanings.${index}.example.sentence` as const
                    const exampleSentence = watch(exampleSentenceFormName)
                    if (!author) {
                        clearErrors(exampleSentenceFormName)
                        return true
                    }
                    if (!exampleSentence && author) return t('ExampleSentence.Required')
                    return true
                },
            }}

            render={({ field }) => (
                <>
                    <AddAuthorModal isOpen={isOpen} onClose={onClose} onOpenChange={onOpenChange} isDismissable={false} />
                    <Select
                        as={"div"}
                        tabIndex={0}
                        {...field}
                        onChange={handleSelectionChange}
                        selectedKeys={value}
                        selectionMode='single'
                        radius='md'
                        label={t('Author')}
                        labelPlacement='outside'
                        placeholder={t('SelectAuthor')}
                        description={t('Forms.ExampleSentence.Description')}
                        endContent={(
                            <Button
                                isIconOnly
                                onPress={onOpen}
                                variant='light'
                            >
                                <div className='sr-only'>
                                    {t('AddNewAuthor')}
                                </div>
                                <Plus></Plus>
                            </Button>
                        )}
                    >
                        {
                            data.map((att) => (
                                <SelectItem key={att.id}>
                                    {att.name}
                                </SelectItem>
                            ))
                        }
                    </Select>
                </>
            )}
        />
    )
}
