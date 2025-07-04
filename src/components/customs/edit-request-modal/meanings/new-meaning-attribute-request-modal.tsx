import { api } from "@/src/trpc/react";
import { NewAttributeForm } from "@/types";
import { ModalVariantProps, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { AriaModalOverlayProps } from '@react-aria/overlays';
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { CustomModal } from "@/src/components/customs/heroui/custom-modal";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";

type AddMeaningAttributeModalProps = {
    onClose: () => void,
    isOpen: boolean,
    onOpenChange: () => void,
    onAttributeRequested?: (attribute: string) => void
} & AriaModalOverlayProps & ModalVariantProps

export default function NewMeaningAttributeRequestModal({
    isOpen,
    onOpenChange,
    onClose,
    onAttributeRequested,
    ...modalProps
}: AddMeaningAttributeModalProps) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const { control: newAttributeControl, handleSubmit, reset } = useForm<NewAttributeForm>()
    const t = useTranslations();
    const requestUtils = api.useUtils().request

    const addMeaningAttributeMutation = api.request.newMeaningAttribute.useMutation({
        onError(error: any, variables: any, context: any) {
            console.log(error)
            if (error.message === "captchaFailed") {
                toast.error(t("Errors.captchaFailed"))
            } else {
                toast.error(t("Requests.ErrorSubmittingRequest"))
            }
        },
        onSuccess(data: any, variables: any) {
            reset()
            toast.success(t("Requests.MeaningAttributeRequestedSuccessfully"))
            // Temporarily add to selection list
            if (onAttributeRequested) {
                onAttributeRequested(variables.attribute)
            }
            requestUtils.getMeaningAttributesWithRequested.invalidate()
            onClose()
        }
    })

    async function onNewAttributeSubmit(newAttribute: NewAttributeForm) {
        if (!executeRecaptcha) {
            toast.error(t("Errors.captchaError"));
            return;
        }
        try {
            const token = await executeRecaptcha("new_meaning_attribute_request");
            addMeaningAttributeMutation.mutate({ attribute: newAttribute.attribute, captchaToken: token });
        } catch (error) {
            console.error("reCAPTCHA execution failed:", error);
            toast.error(t("Errors.captchaError"));
        }
    }

    return (
        <CustomModal size='xs' isOpen={isOpen} onOpenChange={onOpenChange} key="create-meaning-attribute-modal" {...modalProps}>
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>
                            {t("AddNewMeaningAttribute")}
                        </ModalHeader>
                        <ModalBody>
                            <form key={'add-meaning-attribute-form'} onSubmit={(e) => {
                                e.stopPropagation()
                                handleSubmit(onNewAttributeSubmit)(e)
                            }} className='grid gap-2'>
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
                                    <CustomInput placeholder={t("EnterMeaningAttribute")} {...field} isInvalid={error !== undefined} errorMessage={error?.message} />
                                )} />
                                <div className='grid grid-cols-2 gap-2'>
                                    <Button size='sm' type='submit' color='primary' isLoading={addMeaningAttributeMutation.isPending}>
                                        {t("Forms.Submit")}
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
        </CustomModal>
    )
}
