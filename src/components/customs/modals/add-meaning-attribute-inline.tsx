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
type AddMeaningAttributeModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void
} & AriaModalOverlayProps & ModalVariantProps
export default function AddMeaningAttributeModal({
    onClose,
    isOpen,
    onOpenChange,
    ...modalProps
}: AddMeaningAttributeModalProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const t = useTranslations();
    const { control: newAttributeControl, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewAttributeForm>()
    const paramsUtils = api.useUtils().params
    const addMeaningAttributeMutation = api.admin.addNewMeaningAttribute.useMutation({
        onError(error, variables, context) {
            console.error("[AddMeaningAttribute] Error:", error)
            toast.error(t("AnErrorOccuredPleaseTryAgain"))
        },
        onSuccess(data) {
            reset()
            toast.success(t("AttributeAddedSuccessfully"))
            onClose()
            paramsUtils.getExampleSentenceAuthors.invalidate()
        }
    })
    function onNewAttributeSubmit(newAttribute: NewAttributeForm) {
        addMeaningAttributeMutation.mutate(newAttribute.attribute)
    }
  return <InlineSupport isPending={addMeaningAttributeMutation.isPending || isSubmitting} onSubmit={() => handleSubmit(onNewAttributeSubmit)()} open={isOpen} title={t('AddNewMeaningAttribute')}>
                            <div className='grid gap-2'>
                                <Controller control={newAttributeControl} name='attribute' rules={{
                                    required: {
                                        value: true,
                                        message: t('Forms.MeaningAttributes.Required')
                                    },
                                    minLength: {
                                        message: t('Forms.MeaningAttributes.MinLength2'),
                                        value: 2
                                    }
                                }} render={({ field, fieldState: { error } }) => (
                                    <Input placeholder={t('EnterMeaningAttribute')} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type="button" onPress={() => handleSubmit(onNewAttributeSubmit)()} color='primary' isLoading={addMeaningAttributeMutation.isPending || isSubmitting}>
                                        {t('Submit')}
                                    </Button>
                                    <Button size='sm' onPress={onClose}>
                                        {t('Cancel')}
                                    </Button>
                                </div>
                            </div>
                        </InlineSupport>;
}
