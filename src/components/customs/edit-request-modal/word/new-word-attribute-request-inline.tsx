"use client";
import { InlineSupport } from "@/src/components/task-pages/inline-support";
import { api } from "@/src/trpc/react";
import { NewAttributeForm } from "@/types";
import { ModalVariantProps, Button } from "@heroui/react";
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { CustomInput } from "@/src/components/customs/heroui/custom-input";

type AddWordAttributeModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void
} & AriaModalOverlayProps & ModalVariantProps

export default function NewWordAttributeRequestModal({
    isOpen,
    onOpenChange,
    onClose,
    ...modalProps
}: AddWordAttributeModalProps) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const { control: newAttributeControl, handleSubmit, reset, formState: { isSubmitting } } = useForm<NewAttributeForm>()
    const t = useTranslations();
    const requestUtils = api.useUtils().request
    const addWordAttributeMutation = api.request.newWordAttribute.useMutation({
        onError(error, variables, context) {
            console.log(error)
            if (error.message === "captchaFailed") {
                toast.error(t("Errors.captchaFailed"))
            } else {
                toast.error(t("Requests.ErrorSubmittingRequest"))
            }
        },
        onSuccess(data) {
            reset()
            toast.success(t("Requests.AttributeRequestedSuccessfully"))
            requestUtils.getWordAttributesWithRequested.invalidate()
            onClose()
        }
    })
    async function onNewAttributeSubmit(newAttribute: NewAttributeForm) {
        if (!executeRecaptcha) {
            toast.error(t("Errors.captchaError"));
            return;
        }
        try {
            const token = await executeRecaptcha("new_word_attribute_request");
            addWordAttributeMutation.mutate({ attribute: newAttribute.attribute, captchaToken: token });
        } catch (error) {
            console.error("reCAPTCHA execution failed:", error);
            toast.error(t("Errors.captchaError"));
        }
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
                                    <CustomInput placeholder={t("EnterWordAttribute")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type="button" onPress={() => handleSubmit(onNewAttributeSubmit)()} color='primary' isLoading={addWordAttributeMutation.isPending || isSubmitting}>
                                        {t("Forms.Submit")}
                                    </Button>
                                    <Button size='sm' onPress={onClose}>
                                        {t("Cancel")}
                                    </Button>
                                </div>
                            </div>
                        </InlineSupport>;
}
