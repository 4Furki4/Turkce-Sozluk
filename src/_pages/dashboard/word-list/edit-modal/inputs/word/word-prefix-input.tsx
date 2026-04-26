"use client"
import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function WordPrefixInput({
    control
}: {
    control: Control<EditWordForm>
}) {
    return (
        <Controller
            control={control}
            name="prefix"
            render={({ field }) => (
                <Input
                    {...field}
                    radius='md'
                    label="Prefix"
                    labelPlacement='outside'
                    placeholder='You can enter a prefix for the word here'
                />
            )}
        />
    )
}
