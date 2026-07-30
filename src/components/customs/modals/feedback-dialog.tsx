"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    Radio,
    RadioGroup,
    Textarea,
} from "@heroui/react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useSnapshot } from "valtio";

import { feedbackTypeEnum } from "@/db/schema/feedbacks";
import { CaptchaProvider } from "@/src/components/customs/captcha-provider";
import { preferencesState } from "@/src/store/preferences";
import { api } from "@/src/trpc/react";
import { cn } from "@/lib/utils";

const feedbackSchema = z.object({
    title: z.string().min(5, "Error.titleMinLength"),
    description: z.string().min(10, "Error.descriptionMinLength"),
    type: z.enum(feedbackTypeEnum.enumValues),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;
type FeedbackDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function FeedbackDialog(props: FeedbackDialogProps) {
    return (
        <CaptchaProvider>
            <FeedbackDialogContent {...props} />
        </CaptchaProvider>
    );
}

function FeedbackDialogContent({
    isOpen,
    onOpenChange,
}: FeedbackDialogProps) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const t = useTranslations("Feedback.NewForm");
    const tError = useTranslations("Errors");
    const utils = api.useUtils();
    const { executeRecaptcha } = useGoogleReCaptcha();
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: { type: "feature" },
    });

    const createFeedback = api.feedback.create.useMutation({
        onSuccess: () => {
            toast.success(t("submitSuccess"));
            utils.feedback.list.invalidate();
            onOpenChange(false);
            reset();
        },
        onError: (error) => {
            toast.error(tError(error.message as never));
        },
    });

    const onSubmit = async (data: FeedbackFormValues) => {
        if (!executeRecaptcha) {
            console.error("reCAPTCHA not available");
            toast.error(t("captchaError"));
            return;
        }

        try {
            const token = await executeRecaptcha("feedback_submission");
            createFeedback.mutate({ ...data, captchaToken: token });
        } catch (error) {
            console.error("reCAPTCHA execution failed:", error);
            toast.error(t("captchaError"));
        }
    };

    return (
        <Modal
            motionProps={{
                variants: {
                    enter: {
                        opacity: 1,
                        transition: { duration: 0.1, ease: "easeInOut" },
                    },
                    exit: {
                        opacity: 0,
                        transition: { duration: 0.1, ease: "easeInOut" },
                    },
                },
            }}
            classNames={{
                base: cn(
                    "bg-background border-2 border-border rounded-md p-2 w-full",
                    {
                        "bg-background/60 shadow-medium backdrop-blur-md backdrop-saturate-150 transition-transform-background motion-reduce:transition-none":
                            isBlurEnabled,
                    },
                ),
            }}
            size="2xl"
            scrollBehavior="inside"
            backdrop="opaque"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
        >
            <ModalContent>
                {(close) => (
                    <>
                        <ModalHeader>{t("title")}</ModalHeader>
                        <ModalBody>
                            <p className="text-muted-foreground pb-4">
                                {t("description")}
                            </p>
                            <form
                                onSubmit={handleSubmit(onSubmit)}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="font-semibold">
                                        {t("typeLabel")}
                                    </label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <RadioGroup
                                                {...field}
                                                className="mt-2 flex gap-4"
                                            >
                                                <Radio value="feature">
                                                    {t("types.feature")}
                                                </Radio>
                                                <Radio value="bug">
                                                    {t("types.bug")}
                                                </Radio>
                                                <Radio value="other">
                                                    {t("types.other")}
                                                </Radio>
                                            </RadioGroup>
                                        )}
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="title"
                                        className="font-semibold"
                                    >
                                        {t("feedbackTitleLabel")}
                                    </label>
                                    <Input
                                        id="title"
                                        {...register("title")}
                                        placeholder={t("feedbackTitlePlaceholder")}
                                        className="mt-2"
                                    />
                                    {errors.title ? (
                                        <p className="text-red-500 text-sm mt-1">
                                            {t(errors.title.message as never)}
                                        </p>
                                    ) : null}
                                </div>
                                <div>
                                    <label
                                        htmlFor="description"
                                        className="font-semibold"
                                    >
                                        {t("feedbackDescriptionLabel")}
                                    </label>
                                    <Textarea
                                        id="description"
                                        {...register("description")}
                                        placeholder={t(
                                            "feedbackDescriptionPlaceholder",
                                        )}
                                        rows={5}
                                        className="mt-2"
                                    />
                                    {errors.description ? (
                                        <p className="text-red-500 text-sm mt-1">
                                            {t(errors.description.message as never)}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex justify-end gap-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onPress={close}
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="primary"
                                        isLoading={isSubmitting}
                                    >
                                        {t("submitButton")}
                                    </Button>
                                </div>
                            </form>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
