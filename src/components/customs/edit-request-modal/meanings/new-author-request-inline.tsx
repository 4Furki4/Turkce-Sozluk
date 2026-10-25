"use client";
import { InlineSupport } from "@/src/components/task-pages/inline-support";
import { api } from "@/src/trpc/react";
import { NewAuthorForm } from "@/types";
import { ModalVariantProps, Button } from "@heroui/react";
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { CustomInput } from "@/src/components/customs/heroui/custom-input";

type AddAuthorModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void,
    onAuthorRequested?: (author: string) => void
} & AriaModalOverlayProps & ModalVariantProps

export default function NewAuthorRequestModal({
    isOpen,
    onOpenChange,
    onClose,
    onAuthorRequested,
    ...modalProps
}: AddAuthorModalProps) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const { control: newAuthorControl, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewAuthorForm>()
    const t = useTranslations();
    const requestUtils = api.useUtils().request

    const addAuthorMutation = api.request.newAuthor.useMutation({
        onError(error: unknown, variables: NewAuthorForm, context: unknown) {
            console.log(error)
            if (error instanceof Error && error.message === "captchaFailed") {
                toast.error(t("Errors.captchaFailed"))
            } else {
                toast.error(t("Requests.ErrorSubmittingRequest"))
            }
        },
        onSuccess(data: unknown, variables: NewAuthorForm) {
            reset()
            toast.success(t("Requests.AuthorRequestedSuccessfully"))
            // Temporarily add to selection list
            if (onAuthorRequested) {
                onAuthorRequested(variables.name)
            }
            requestUtils.getAuthorsWithRequested.invalidate()
            onClose()
        }
    })

    async function onNewAuthorSubmit(newAuthor: NewAuthorForm) {
        if (!executeRecaptcha) {
            toast.error(t("Errors.captchaError"));
            return;
        }
        try {
            const token = await executeRecaptcha("new_author_request");
            addAuthorMutation.mutate({ name: newAuthor.name, captchaToken: token });
        } catch (error) {
            console.error("reCAPTCHA execution failed:", error);
            toast.error(t("Errors.captchaError"));
        }
    }

  return <InlineSupport isPending={addAuthorMutation.isPending || isSubmitting} onSubmit={() => handleSubmit(onNewAuthorSubmit)()} open={isOpen} title={t("AddNewAuthor")}>
                            <div className='grid gap-2'>
                                <Controller control={newAuthorControl} name='name' rules={{
                                    required: {
                                        value: true,
                                        message: t("Forms.Authors.Required")
                                    },
                                    minLength: {
                                        message: t("Forms.Authors.MinLength2"),
                                        value: 2
                                    }
                                }} render={({ field, fieldState: { error } }) => (
                                    <CustomInput placeholder={t("EnterAuthorName")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type="button" onPress={() => handleSubmit(onNewAuthorSubmit)()} color='primary' isLoading={addAuthorMutation.isPending || isSubmitting}>
                                        {t("Forms.Submit")}
                                    </Button>
                                    <Button size='sm' onPress={onClose}>
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </div>
                        </InlineSupport>;
}
