"use client";
import { InlineSupport } from "@/src/components/task-pages/inline-support";

import { api } from '@/src/trpc/react';
import React from 'react'
import { Button, Input, ModalVariantProps } from "@heroui/react"
import { NewAttributeForm } from '@/types';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { useTranslations } from "next-intl";
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
type AddAuthorModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void,
} & AriaModalOverlayProps & ModalVariantProps
export default function AddAuthorModal({
    isOpen,
    onClose,
    onOpenChange,
    ...modalProps
}: AddAuthorModalProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const t = useTranslations()
    const { control: newAttributeControl, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewAttributeForm>()
    const paramsUtils = api.useUtils().params
    const addAuthorMutation = api.admin.addAuthor.useMutation({
        onError(error, variables, context) {
            console.error("[AddAuthor] Error:", error)
            toast.error(t("AnErrorOccuredPleaseTryAgain"))
        },
        onSuccess(data) {
            reset()
            toast.success(t("AuthorAddedSuccessfully"))
            onClose()
            paramsUtils.getExampleSentenceAuthors.invalidate()
        }
    })
    function onNewAttributeSubmit(newAttribute: NewAttributeForm) {
        addAuthorMutation.mutate(newAttribute.attribute)
    }
  return <InlineSupport isPending={addAuthorMutation.isPending || isSubmitting} onSubmit={() => handleSubmit(onNewAttributeSubmit)()} open={isOpen} title={t('AddNewAuthor')}>
                            <div className='grid gap-2'>
                                <Controller control={newAttributeControl} name='attribute' rules={{
                                    required: {
                                        value: true,
                                        message: t("Forms.Authors.Required")
                                    },
                                    minLength: {
                                        message: t("Forms.Authors.MinLength2"),
                                        value: 2
                                    }
                                }} render={({ field, fieldState: { error } }) => (
                                    <Input placeholder={t("EnterAuthor")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type="button" onPress={() => handleSubmit(onNewAttributeSubmit)()} color='primary' isLoading={addAuthorMutation.isPending || isSubmitting}>
                                        {t("Submit")}
                                    </Button>
                                    <Button size='sm' onPress={onClose}>
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </div>
                        </InlineSupport>;
}
