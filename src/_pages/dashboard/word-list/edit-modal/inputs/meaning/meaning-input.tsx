import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function MeaningInput({
    control,
    index
}: {
    control: Control<EditWordForm>,
    index: number
}) {
    return (
        <Controller
            name={`meanings.${index}.meaning`}
            control={control}
            render={({ field, formState: { errors } }) => (
                <Input {...field}
                    label="Meaning"
                    labelPlacement='outside'
                    radius='md'
                    // placeholder='You must enter a meaning here.'
                    isRequired
                    errorMessage={errors.meanings ? errors.meanings[index]?.meaning?.message : undefined}
                    isInvalid={errors.meanings ? !!errors.meanings[index]?.meaning : undefined}
                />
            )}
        />
    )
}
