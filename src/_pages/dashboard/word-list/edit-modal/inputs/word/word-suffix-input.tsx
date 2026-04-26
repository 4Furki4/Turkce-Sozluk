"use client"
import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function WordSuffixInput({
    control
}: {
    control: Control<EditWordForm>
}) {
    return (
        <Controller
            control={control}
            name="suffix"
            render={({ field }) => (
                <Input
                    {...field}
                    radius='md'
                    label="Suffix"
                    labelPlacement='outside'
                    placeholder='You can enter a suffix for the word here'
                />
            )}
        />
    )
}
