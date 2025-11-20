"use client"
import { Card, type CardProps } from '@heroui/react'
import React from 'react'
import { useSnapshot } from 'valtio'
import { preferencesState } from '@/src/store/preferences'
import { cn } from '@/lib/utils'

interface CustomCardProps extends CardProps {

}

export default function CustomCard({ children, ...props }: CustomCardProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    return (
        <Card
            {...props}
            className={cn("border border-border rounded-sm p-2 w-full", props.className)}
            classNames={{
                base: cn("bg-background/10", props.classNames?.base),
                ...props.classNames
            }}>
            {children}
        </Card>
    )
}
