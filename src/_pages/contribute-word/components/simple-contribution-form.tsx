"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, CardBody, CardHeader } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { api } from "@/src/trpc/react";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/src/server/api/root";
import type { Session } from "@/src/lib/auth";

// Schema for simple form
const getSimpleFormSchema = (minLengthIntl: string) => z.object({
  name: z.string().min(2, minLengthIntl),
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
  const t = useTranslations("ContributeWord");
  const tForms = useTranslations("Forms");
  const { executeRecaptcha } = useGoogleReCaptcha();

  const createSimpleWordRequest = api.request.createSimpleWordRequest.useMutation({
    onSuccess: () => {
      toast.success(t("requestSubmitted"));
      simpleForm.reset();
      setIsSubmitting(false);
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error("Submission error:", error);
      if (error.message?.includes("already requested")) {
        toast.error(t("wordAlreadyRequested"));
      } else if (error.message?.includes("reCAPTCHA")) {
        toast.error(t("captchaFailed"));
      } else {
        toast.error(t("requestFailed"));
      }
      setIsSubmitting(false);
    }
  });

  // Simple form setup
  const simpleForm = useForm<SimpleFormData>({
    resolver: zodResolver(getSimpleFormSchema(tForms("Word.MinLength2"))),
    defaultValues: {
      name: prefillWord || "",
    },
  });

  // Submit simple form
  const onSubmitSimple = async (data: SimpleFormData) => {
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
      simpleForm.reset();
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
    <CustomCard className="max-md:p-0">
      <CardHeader>
        <h2 className="text-lg font-bold">{t("simpleTab")}</h2>
      </CardHeader>
      <CardBody>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("simpleTabDescription")}
          </p>
        </div>

        <form onSubmit={simpleForm.handleSubmit(onSubmitSimple)} className="space-y-6">
          <Controller
            name="name"
            control={simpleForm.control}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label={t("wordName")}
                placeholder={t("wordNamePlaceholder")}
                isRequired
                isInvalid={!!error}
                errorMessage={error?.message}
              />
            )}
          />

          <Button
            type="submit"
            color="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            isDisabled={isSubmitting}
          >
            {tForms("Submit")}
          </Button>
        </form>
      </CardBody>
    </CustomCard>
  );
}
