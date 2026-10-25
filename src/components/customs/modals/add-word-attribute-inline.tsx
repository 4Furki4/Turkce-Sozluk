"use client";
import { InlineSupport } from "@/src/components/task-pages/inline-support";

import { api } from '@/src/trpc/react';
import React from 'react'
import { Button, Input, ModalVariantProps } from "@heroui/react"
import { NewAttributeForm } from '@/types';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { useTranslations } from 'next-intl';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';

type AddWordAttributeModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void
} & AriaModalOverlayProps & ModalVariantProps
export default function AddWordAttributeModal({
    onClose,
    isOpen,
    onOpenChange,
    ...modalProps
}: AddWordAttributeModalProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const t = useTranslations()
    const { control: newAttributeControl, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewAttributeForm>()
    const paramsUtils = api.useUtils().params
    const addWordAttributeMutation = api.admin.addNewWordAttribute.useMutation({
        onError(error, variables, context) {
            console.error("[AddWordAttribute] Error:", error)
            toast.error(t("AnErrorOccuredPleaseTryAgain"))
        },
        onSuccess(data) {
            reset()
            toast.success(t("AttributeAddedSuccessfully"))
            onClose()
            paramsUtils.getWordAttributes.invalidate()
        }
    })
    function onNewAttributeSubmit(newAttribute: NewAttributeForm) {
        addWordAttributeMutation.mutate(newAttribute.attribute)
    }
  return <InlineSupport isPending={addWordAttributeMutation.isPending || isSubmitting} onSubmit={() => handleSubmit(onNewAttributeSubmit)()} open={isOpen} title={t("AddNewWordAttribute")}>
                            <div className='grid gap-2'>
                                <Controller control={newAttributeControl} name='attribute' rules={{
                                    required: {
                                        value: true,
                                        message: t("Forms.Attributes.Required")
                                    },
                                    minLength: {
                                        message: t("Forms.Attributes.MinLength2"),
                                        value: 2
                                    }
                                }} render={({ field, fieldState: { error } }) => (
                                    <Input placeholder={t("EnterWordAttribute")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type="button" onPress={() => handleSubmit(onNewAttributeSubmit)()} color='primary' isLoading={addWordAttributeMutation.isPending || isSubmitting}>
                                        {t("Submit")}
                                    </Button>
                                    <Button size='sm' onPress={onClose}>
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </div>
                        </InlineSupport>;
}
