"use client";
import { CustomTextarea as Textarea } from "@/src/components/customs/heroui/custom-textarea";
import { CustomInput as Input } from "@/src/components/customs/heroui/custom-input";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, Radio, RadioGroup } from "@heroui/react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { feedbackTypeEnum } from "@/db/schema/feedbacks";
import { CaptchaProvider } from "@/src/components/customs/captcha-provider";
import { api } from "@/src/trpc/react";

import {
  TaskPage,
  useTaskActions,
} from "@/src/components/task-pages/task-page";
import { FormDraft } from "@/src/hooks/use-task-draft";
const feedbackSchema = z.object({
  title: z.string().min(5, "Error.titleMinLength"),
  description: z.string().min(10, "Error.descriptionMinLength"),
  type: z.enum(feedbackTypeEnum.enumValues),
});
type FeedbackFormValues = z.infer<typeof feedbackSchema>;
export function FeedbackTask() {
  const t = useTranslations("TaskPage");
  return (
    <TaskPage
      title={t("newFeedback")}
      parent="/feedback"
      parentLabel={t("feedback")}
    >
      <CaptchaProvider>
        <FeedbackForm />
      </CaptchaProvider>
    </TaskPage>
  );
}
function FeedbackForm() {
  const { complete, cancel } = useTaskActions();
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
      complete();
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormDraft<FeedbackFormValues>
        identity="feedback:new"
        control={control}
        reset={reset}
        baseline={{ title: "", description: "", type: "feature" }}
      />
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
        {errors.title ? (
          <p className="text-red-500 text-sm mt-1">
            {t(errors.title.message as never)}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="description" className="font-semibold">
          {t("feedbackDescriptionLabel")}
        </label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder={t("feedbackDescriptionPlaceholder")}
          minRows={5}
          className="mt-2"
        />
        {errors.description ? (
          <p className="text-red-500 text-sm mt-1">
            {t(errors.description.message as never)}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onPress={cancel}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          isLoading={isSubmitting || createFeedback.isPending}
        >
          {t("submitButton")}
        </Button>
      </div>
    </form>
  );
}
