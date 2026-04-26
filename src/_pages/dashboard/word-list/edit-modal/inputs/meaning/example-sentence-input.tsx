import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function ExampleSentenceInput({
    control,
    index
}: {
    control: Control<EditWordForm>,
    index: number
}) {
    return (
        <Controller
            name={`meanings.${index}.exampleSentence`}
            control={control}
            render={({ field }) => (
                <Input
                    placeholder='You can enter an example sentence for this meaning.'
                    label="Example Sentence"
                    labelPlacement='outside'
                    radius='md'
                    {...field}
                />
            )}
        />
    )
}
