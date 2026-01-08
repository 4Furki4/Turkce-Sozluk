"use client"
import { api } from '@/src/trpc/react';
import React from 'react'
import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader, ModalVariantProps } from "@heroui/react"
import { NewAttributeForm } from '@/types';
import { toast } from 'sonner';
import { Controller, useForm } from 'react-hook-form';
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { useTranslations } from "next-intl";
import { cn } from '@/lib/utils';
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
    const { control: newAttributeControl, handleSubmit, reset } = useForm<NewAttributeForm>()
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
    return (
        <Modal motionProps={{
            variants: {
                enter: {
                    opacity: 1,
                    transition: {
                        duration: 0.1,
                        ease: 'easeInOut',
                    }
                },
                exit: {
                    opacity: 0,
                    transition: {
                        duration: 0.1,
                        ease: 'easeInOut',
                    }
                },
            }
        }} classNames={{
            base: cn(
                "bg-background border-2 border-border rounded-sm p-2 w-full",
                { "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none": isBlurEnabled }
            )
        }} size='xs' isOpen={isOpen} onOpenChange={onOpenChange} key="create-attribute-modal" {...modalProps}>
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>
                            {t('AddNewAuthor')}
                        </ModalHeader>
                        <ModalBody>
                            <form key={'add-author-form'} onSubmit={e => {
                                e.stopPropagation()
                                handleSubmit(onNewAttributeSubmit)(e)
                            }} className='grid gap-2'>
                                <Controller control={newAttributeControl} name='attribute' rules={{
                                    required: {
                                        value: true,
                                        message: t("Forms.Author.NameRequired")
                                    },
                                    minLength: {
                                        message: t("Forms.Author.MinLength2"),
                                        value: 2
                                    }
                                }} render={({ field, fieldState: { error } }) => (
                                    <Input placeholder={t("EnterAuthor")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type='submit' color='primary' isLoading={addAuthorMutation.isPending}>
                                        {t("Submit")}
                                    </Button>
                                    <Button size='sm' onPress={close}>
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </form>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>

    )
}
