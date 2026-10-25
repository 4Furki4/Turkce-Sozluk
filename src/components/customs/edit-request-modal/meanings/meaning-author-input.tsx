import { Control, Controller } from 'react-hook-form'
import { Select, SelectItem } from '@heroui/react'
import { MeaningEditRequestForm } from './meaning-form-types'
import { useTranslations } from 'next-intl'
export default function MeaningAuthorInput({ control, meaningAuthors, meaningAuthorsIsLoading }:
    {
        control: Control<MeaningEditRequestForm>,
        meaningAuthors: {
            id: string;
            name: string;
        }[] | undefined,
        meaningAuthorsIsLoading: boolean
    }) {
    const t = useTranslations()
    return (
        <Controller
            name={`authorId`}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <Select
                    {...field}
                    items={meaningAuthors || []}
                    isLoading={meaningAuthorsIsLoading}
                    selectedKeys={field.value?.toString() ? new Set([field.value?.toString()]) : new Set()}
                    label={t("Author")}
                    placeholder={t("SelectAuthor")}
                    isInvalid={!!error}
                    errorMessage={error?.message}
                    className="w-full"
                >
                    {(author) => (
                        <SelectItem key={author.id.toString()} >
                            {author.name}
                        </SelectItem>
                    )}
                </Select>
            )}
        />
    )
}
