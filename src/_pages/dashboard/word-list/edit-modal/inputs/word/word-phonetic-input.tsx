"use client"
import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function WordPhoneticInput({
    control
}: {
    control: Control<EditWordForm>
}) {
    return (
        <Controller
            control={control}
            name="phonetic"
            render={({ field, fieldState: { error } }) => (
                <Input
                    {...field}
                    radius='md'
                    labelPlacement='outside'
                    label="Phonetic"
                    placeholder={`You can enter the word's phonetic here like ahva:li`}
                />
            )}
        />
    )
}
