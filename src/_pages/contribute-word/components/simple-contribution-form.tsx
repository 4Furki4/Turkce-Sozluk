"use client";
import { FormDraft } from "@/src/hooks/use-task-draft";
import { TaskCancel, useTaskActions } from "@/src/components/task-pages/task-page";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { api } from "@/src/trpc/react";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import type { Session } from "@/src/lib/auth";

// Schema for simple form
const getSimpleFormSchema = (minLengthIntl: string) => z.object({
  name: z.string().trim().min(2, minLengthIntl),
});

type SimpleFormData = z.infer<ReturnType<typeof getSimpleFormSchema>>;

export interface SimpleContributionFormProps {
  session: Session | null;
  locale: "en" | "tr";
  prefillWord?: string;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

export default function SimpleContributionForm({
  session,
  locale,
  prefillWord,
  isSubmitting,
  setIsSubmitting
}: SimpleContributionFormProps) {
  const { complete } = useTaskActions();
  const t = useTranslations("ContributeWord");
  const tForms = useTranslations("Forms");
  const { executeRecaptcha } = useGoogleReCaptcha();

  const createSimpleWordRequest = api.request.createSimpleWordRequest.useMutation();

  // Simple form setup
  const simpleForm = useForm<SimpleFormData>({
    resolver: zodResolver(getSimpleFormSchema(tForms("Word.MinLength2"))),
    defaultValues: {
      name: prefillWord || "",
    },
  });

  // Submit simple form
  const onSubmitSimple = async (data: SimpleFormData) => {
    if (isSubmitting || createSimpleWordRequest.isPending) return;
    if (!executeRecaptcha) {
      toast.error(t("captchaFailed"));
      return;
    }

    setIsSubmitting(true);
    try {
      const captchaToken = await executeRecaptcha("submit_simple_word_request");

      await createSimpleWordRequest.mutateAsync({
        wordName: data.name.trim(),
        captchaToken,
      });

      toast.success(t("requestSubmitted"));
      simpleForm.reset({ name: "" });
      complete();
    } catch (error: any) {
      console.error("Submission error:", error);
      if (error.message?.includes("already requested")) {
        toast.error(t("wordAlreadyRequested"));
      } else if (error.message?.includes("reCAPTCHA")) {
        toast.error(t("captchaFailed"));
      } else {
        toast.error(t("requestFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={simpleForm.handleSubmit(onSubmitSimple)} className="space-y-4">
      <FormDraft identity={"word-simple:new:" + (prefillWord ?? "")} control={simpleForm.control} reset={simpleForm.reset} baseline={{ name: prefillWord || "" }} />
      <Controller
        name="name"
        control={simpleForm.control}
        render={({ field, fieldState: { error } }) => (
          <CustomInput
            {...field}
            label={t("wordName")}
            placeholder={t("wordNamePlaceholder")}
            color="default"
            classNames={{
              inputWrapper: "border-foreground/35 shadow-none group-data-[hover=true]:border-foreground/55 group-data-[focus=true]:border-primary group-data-[invalid=true]:border-danger",
            }}
            isRequired
            isInvalid={!!error}
            errorMessage={error?.message}
          />
        )}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <TaskCancel />
        <Button
          type="submit"
          color="primary"
          size="md"
          className="h-auto min-h-11 min-w-fit max-w-full flex-1 whitespace-normal py-2 sm:min-w-32 sm:flex-none"
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
        >
          {t("submitForReview")}
        </Button>
      </div>
    </form>
  );
}
