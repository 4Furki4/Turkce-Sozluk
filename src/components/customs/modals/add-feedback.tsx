"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    Input,
    RadioGroup,
    Radio,
    Textarea,
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@heroui/react";
import { feedbackTypeEnum } from "@/db/schema/feedbacks"; // Corrected import path
import { type Session } from "@/src/lib/auth";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3"
import { cn } from '@/lib/utils';
import { useSnapshot } from 'valtio';
import { preferencesState } from '@/src/store/preferences';
import { usePathname, useRouter } from "@/src/i18n/routing";
// Zod schema for form validation
const feedbackSchema = z.object({
    title: z.string().min(5, "Error.titleMinLength"),
    description: z.string().min(10, "Error.descriptionMinLength"),
    type: z.enum(feedbackTypeEnum.enumValues),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

// The complete modal component including the trigger and popover logic
export function FeedbackModal({
    children,
    session,
    variant = "button",
    className,
}: {
    children: React.ReactNode;
    session: Session | null;
    variant?: "button" | "link";
    className?: string;
}) {
    const { isBlurEnabled } = useSnapshot(preferencesState);
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("Feedback.NewForm");
    const tError = useTranslations('Errors');
    const tGlobal = useTranslations("Navbar");
    const utils = api.useUtils();
    const router = useRouter();
    const pathName = usePathname();
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
            utils.feedback.list.invalidate(); // Refresh the feedback list
            setIsOpen(false); // Close modal on success
            reset(); // Clear the form
        },
        onError: (error) => {
            toast.error(tError(error.message as any));
        },
    });

    const onSubmit = async (data: FeedbackFormValues) => {
        if (!executeRecaptcha) {
            console.error("reCAPTCHA not available");
            toast.error(t("captchaError"));
            return;
        }

        try {
            // ✨ Generate a token for this specific action
            const token = await executeRecaptcha("feedback_submission");
            // ✨ Call the mutation with the form data and the new token
            createFeedback.mutate({ ...data, captchaToken: token });
        } catch (e) {
            console.error("reCAPTCHA execution failed:", e);
            toast.error(t("captchaError"));
        }
    };

    // If user is not logged in, render the trigger inside a Popover
    if (!session) {
        const PopoverTriggerElement =
            variant === "link" ? (
                <Button color="primary" disableRipple disableAnimation variant="light" className={cn("p-0 m-0 h-max text-base text-text-foreground/60 data-[hover]:dark:bg-transparent data-[hover]:bg-transparent opacity-70 cursor-not-allowed", className)}>
                    {children}
                </Button>
            ) : (
                <Button color="primary" variant="light" className={cn("p-0 m-0 h-max text-base text-text-foreground/60 data-[hover]:dark:bg-transparent data-[hover]:bg-transparent opacity-70 cursor-not-allowed", className)}>
                    {children}
                </Button>
            );

        return (
            <Popover showArrow placement="top">
                <PopoverTrigger className="self-start">{PopoverTriggerElement}</PopoverTrigger>
                <PopoverContent>
                    <div className="px-2 py-2">
                        <div className="text-small font-bold">{t('authRequiredTitle')}</div>
                        <div className="text-tiny">
                            {t('authRequiredDescription')}{' '}
                            <Button
                                color="primary"
                                variant="light"
                                onPress={() => router.push({
                                    pathname: '/signin',
                                    query: {
                                        backTo: window.location.pathname,
                                    },
                                })}
                                className="p-0 m-0 h-max text-base font-semibold data-[hover]:dark:bg-transparent data-[hover]:bg-transparent data-[hover]:text-primary data-[hover]:underline data-[hover]:underline-offset-2 text-primary underline underline-offset-2"
                                disableAnimation
                                disableRipple
                            >
                                {tGlobal('Sign In')}
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // If user is logged in, render the fully functional modal
    const Trigger =
        variant === "link" ?
            <Button variant="light" onPress={() => setIsOpen(true)}
                disableAnimation
                disableRipple
                className={cn("p-0 m-0 h-max text-base data-[hover]:dark:bg-transparent data-[hover]:bg-transparent", className)}>
                {children}
            </Button>
            : (
                <Button color="primary" onPress={() => setIsOpen(true)} className={className}>
                    {children}
                </Button>
            );

    return (
        <>
            {Trigger}
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
            }} size="2xl" scrollBehavior="inside" backdrop="opaque" isOpen={isOpen} onOpenChange={setIsOpen}>
                <ModalContent>
                    {(close) => (
                        <>
                            <ModalHeader>{t("title")}</ModalHeader>
                            <ModalBody>
                                <p className="text-muted-foreground pb-4">{t("description")}</p>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <div>
                                        <label className="font-semibold">{t("typeLabel")}</label>
                                        <Controller
                                            name="type"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} className="mt-2 flex gap-4">
                                                    <Radio value="feature">{t("types.feature")}</Radio>
                                                    <Radio value="bug">{t("types.bug")}</Radio>
                                                    <Radio value="other">{t("types.other")}</Radio>
                                                </RadioGroup>
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="title" className="font-semibold">
                                            {t("feedbackTitleLabel")}
                                        </label>
                                        <Input
                                            id="title"
                                            {...register("title")}
                                            placeholder={t("feedbackTitlePlaceholder")}
                                            className="mt-2"
                                        />
                                        {errors.title && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {t(errors.title.message as any)}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="description" className="font-semibold">
                                            {t("feedbackDescriptionLabel")}
                                        </label>
                                        <Textarea
                                            id="description"
                                            {...register("description")}
                                            placeholder={t("feedbackDescriptionPlaceholder")}
                                            rows={5}
                                            className="mt-2"
                                        />
                                        {errors.description && (
                                            <p className="text-red-500 text-sm mt-1">
                                                {t(errors.description.message as any)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="ghost" onPress={close}>
                                            {t("cancel")}
                                        </Button>
                                        <Button type="submit" color="primary" isLoading={isSubmitting}>
                                            {t("submitButton")}
                                        </Button>
                                    </div>
                                </form>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
