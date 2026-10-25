"use client";
import { FormDraft } from "@/src/hooks/use-task-draft";
import { Button } from "@heroui/button";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { AutocompleteItem } from "@heroui/react";
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import { WordSearchResult } from "@/types";
import WordAttributesRequestInput from "./word/word-attributes-request-input";
import { useTranslations, useLocale } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { TaskCancel } from "@/src/components/task-pages/task-page";

const wordEditRequestSchema = z.object({
  language: z.string().optional(),
  name: z.string().min(1, "Word name is required"),
  phonetic: z.string().optional(),
  prefix: z.string().optional(),
  root: z.string().optional(),
  suffix: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  reason: z.string().min(1, "ReasonRequired").min(15, "ReasonMinLength15"),
});

const getWordEditRequestIntlSchema = (
  wordNameRequired: string,
  reasonRequired: string,
  reasonMinLength: string,
) =>
  z.object({
    language: z.string().optional(),
    name: z.string().min(1, wordNameRequired),
    phonetic: z.string().optional(),
    prefix: z.string().optional(),
    root: z.string().optional(),
    suffix: z.string().optional(),
    attributes: z.array(z.string()).optional(),
    reason: z.string().min(1, reasonRequired).min(15, reasonMinLength),
  });

export type WordEditRequestForm = z.infer<typeof wordEditRequestSchema>;
export type WordEditRequestInitialTab = "edit" | "pronunciation";

export default function WordEditRequest({
  data: { word_data },
  onClose,
  initialTab = "edit",
}: {
  data: WordSearchResult;
  onClose: () => void;
  initialTab?: WordEditRequestInitialTab;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const tRequests = useTranslations("Requests");
  const tTask = useTranslations("TaskPage");
  const [selectedTab, setSelectedTab] =
    useState<WordEditRequestInitialTab>(initialTab);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { data: languages, isLoading: languagesIsLoading } =
    api.params.getLanguages.useQuery();
  const {
    data: wordAttributesWithRequested,
    isLoading: wordAttributesWithRequestedIsLoading,
  } = api.request.getWordAttributesWithRequested.useQuery();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { dirtyFields, isSubmitting },
  } = useForm<WordEditRequestForm>({
    resolver: zodResolver(
      getWordEditRequestIntlSchema(
        t("Forms.Word.Required"),
        t("Requests.Forms.Reason.Required"),
        t("Requests.Forms.Reason.MinLength15"),
      ),
    ),
    defaultValues: {
      name: word_data.word_name,
      phonetic: word_data.phonetic ?? "",
      prefix: word_data.prefix ?? "",
      suffix: word_data.suffix ?? "",
      root: word_data.root.root ?? "",
      attributes:
        word_data.attributes?.map((at) => at.attribute_id.toString()) ?? [],
      language: word_data.root.language_code ?? "",
      reason: "",
    },
  });
  const { mutate, isPending } = api.request.requestEditWord.useMutation({
    onSuccess: () => {
      toast.success(t("Requests.EditRequestSubmittedSuccessfully"));

      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const onSubmit = async (data: WordEditRequestForm) => {
    if (isPending) return;
    if (!executeRecaptcha) {
      toast.error(t("Errors.captchaError"));
      return;
    }
    try {
      const token = await executeRecaptcha("word_edit_request");
      const preparedData = {
        word_id: word_data.word_id,
        reason: data.reason,
        ...Object.keys(dirtyFields).reduce<Record<string, unknown>>(
          (acc, key) => {
            if (
              dirtyFields[key as keyof typeof dirtyFields] &&
              key !== "reason"
            ) {
              acc[key === "name" ? "wordName" : key] =
                data[key as keyof typeof data];
            }
            return acc;
          },
          {},
        ),
        captchaToken: token,
      };
      if (
        Object.keys(dirtyFields).filter((key) => key !== "reason").length === 0
      ) {
        toast.error(tRequests("NoChanges"));
        return;
      }
      mutate(preparedData);
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      toast.error(t("Errors.captchaError"));
    }
  };

  useEffect(() => {
    setSelectedTab(initialTab);
  }, [initialTab]);

  const inputStyles = { inputWrapper: "h-12 min-h-12 shadow-none" };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FormDraft
        identity={"word-edit:" + word_data.word_id}
        control={control}
        reset={reset}
        baseline={{
          name: word_data.word_name,
          phonetic: word_data.phonetic ?? "",
          prefix: word_data.prefix ?? "",
          suffix: word_data.suffix ?? "",
          root: word_data.root.root ?? "",
          language: word_data.root.language_code ?? "",
          attributes:
            word_data.attributes?.map((at) => String(at.attribute_id)) ?? [],
          reason: "",
        }}
      />
      <section className="space-y-5" aria-labelledby="word-edit-details">
        <h2 id="word-edit-details" className="pb-2 text-lg font-semibold">
          {tTask("wordDetails")}
        </h2>
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              {...field}
              label={t("WordName")}
              labelPlacement="outside"
              placeholder={t("EnterWordName")}
              classNames={inputStyles}
              isRequired
              isInvalid={!!error}
              errorMessage={error?.message}
            />
          )}
        />
        <div className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-2">
          <Controller
            name="prefix"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label={t("Prefix")}
                labelPlacement="outside"
                placeholder={t("EnterPrefix")}
                classNames={inputStyles}
                isInvalid={!!error}
                errorMessage={error?.message}
              />
            )}
          />
          <Controller
            name="suffix"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label={t("Suffix")}
                labelPlacement="outside"
                placeholder={t("EnterSuffix")}
                classNames={inputStyles}
                isInvalid={!!error}
                errorMessage={error?.message}
              />
            )}
          />
          <Controller
            name="language"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomAutocomplete
                radius="md"
                {...field}
                label={t("Language")}
                isLoading={languagesIsLoading}
                labelPlacement="outside"
                defaultItems={languages || []}
                placeholder={t("EnterLanguage")}
                classNames={{ base: "sm:max-w-none" }}
                inputProps={{ size: "lg", classNames: inputStyles }}
                selectedKey={field.value || null}
                onSelectionChange={(item) =>
                  field.onChange(item?.toString() ?? "")
                }
                isInvalid={!!error}
                errorMessage={error?.message}
              >
                {(language) => (
                  <AutocompleteItem key={language.language_code}>
                    {locale === "en"
                      ? language.language_en
                      : language.language_tr}
                  </AutocompleteItem>
                )}
              </CustomAutocomplete>
            )}
          />
          <Controller
            name="root"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label={t("Root")}
                labelPlacement="outside"
                placeholder={t("EnterRoot")}
                classNames={inputStyles}
                isInvalid={!!error}
                errorMessage={error?.message}
              />
            )}
          />
          <WordAttributesRequestInput
            wordAttributes={wordAttributesWithRequested}
            wordAttributesIsLoading={wordAttributesWithRequestedIsLoading}
            control={control}
          />
          <Controller
            name="phonetic"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                {...field}
                label={t("Phonetic")}
                labelPlacement="outside"
                placeholder={t("EnterPhonetic")}
                classNames={inputStyles}
                isInvalid={!!error}
                errorMessage={error?.message}
              />
            )}
          />
        </div>
      </section>
      <section
        className="space-y-4 border-t border-divider pt-6"
        aria-labelledby="word-edit-reason"
      >
        <div className="space-y-1.5">
          <h2 id="word-edit-reason" className="text-lg font-semibold">
            {tRequests("Reason")}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/70">
            {tTask("reasonHint")}
          </p>
        </div>
        <Controller
          name="reason"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomTextarea
              {...field}
              aria-labelledby="word-edit-reason"
              placeholder={tRequests("EnterReason")}
              isRequired
              isInvalid={!!error}
              errorMessage={error?.message}
              minRows={4}
              className="w-full"
              classNames={{ inputWrapper: "shadow-none" }}
            />
          )}
        />
      </section>
      <div className="flex flex-col-reverse gap-2 border-t border-divider pt-5 sm:flex-row sm:justify-end sm:gap-3">
        <TaskCancel />
        <Button
          color="primary"
          type="submit"
          className="min-h-11"
          isLoading={isPending || isSubmitting}
        >
          {t("Requests.SubmitRequest")}
        </Button>
      </div>
    </form>
  );
}
