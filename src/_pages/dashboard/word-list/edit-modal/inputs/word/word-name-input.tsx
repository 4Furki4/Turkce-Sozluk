"use client"
import { EditWordForm } from '@/types'
import { Input } from "@heroui/react"
import React from 'react'
import { Control, Controller } from 'react-hook-form'

export default function WordNameInput({
    control
}: {
    control: Control<EditWordForm, any>
}) {
    return (
        <Controller name='name' control={control} render={({ field, formState: { errors } }) => (
            <Input
                {...field}
                radius='md'
                labelPlacement='outside'
                label="Word name"
                placeholder='You must enter a word name here.'
                isRequired
                errorMessage={errors.name?.message}
                isInvalid={!!errors.name}
            />
        )} />
    )
}
