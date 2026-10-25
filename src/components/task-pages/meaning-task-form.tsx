"use client";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { api } from "@/src/trpc/react";
import { type WordSearchResult } from "@/types";
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import MeaningAttributesInput from "@/src/components/customs/edit-request-modal/meanings/meaning-attributes-input";
import MeaningAuthorInput from "@/src/components/customs/edit-request-modal/meanings/meaning-author-input";
import PartOfSpeechInput from "@/src/components/customs/edit-request-modal/meanings/part-of-speech-input";
import { FormDraft } from "@/src/hooks/use-task-draft";
import { TaskCancel, useTaskActions } from "./task-page";

export function MeaningTaskForm({
  meaning,
  operation,
}: {
  meaning: WordSearchResult["word_data"]["meanings"][number];
  operation: "new" | "edit" | "remove";
}) {
  const t = useTranslations();
  const { complete } = useTaskActions();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const schema = z.object({
    meaning: z
      .string()
      .min(operation === "remove" ? 0 : 1, t("Forms.Meanings.Required")),
    partOfSpeechId: z.string().optional(),
    attributes: z.array(z.string()).optional(),
    sentence: z.string().optional(),
    authorId: z.string().optional(),
    reason: z.string().min(15, t("Requests.ReasonMinLength15")),
  });
  const baseline = {
    meaning: meaning.meaning,
    partOfSpeechId: meaning.part_of_speech_id?.toString() ?? "",
    attributes:
      meaning.attributes?.map((item) => String(item.attribute_id)) ?? [],
    sentence: meaning.sentence ?? "",
    authorId: meaning.author_id?.toString() ?? "",
    reason: "",
  };
  const {
    control,
    reset,
    handleSubmit,
    formState: { dirtyFields, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: baseline,
  });
  const attributes = api.params.getMeaningAttributes.useQuery();
  const authors = api.params.getExampleSentenceAuthors.useQuery();
  const parts = api.params.getPartOfSpeeches.useQuery();
  const options = {
    onSuccess: () => {
      toast.success(t("TaskPage.submitted"));
      complete();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const edit = api.request.requestEditMeaning.useMutation(options);
  const remove = api.request.requestDeleteMeaning.useMutation(options);
  const pending = isSubmitting || edit.isPending || remove.isPending;
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (data) => {
        if (edit.isPending || remove.isPending) return;
        if (!executeRecaptcha) {
          toast.error(t("Errors.captchaError"));
          return;
        }
        try {
          const captchaToken = await executeRecaptcha(
            operation === "remove"
              ? "meaning_delete_request"
              : "meaning_edit_request",
          );
          if (operation === "remove")
            await remove.mutateAsync({
              meaning_id: meaning.meaning_id,
              reason: data.reason,
              captchaToken,
            });
          else {
            if (!Object.keys(dirtyFields).some((key) => key !== "reason")) {
              toast.error(t("Requests.NoChanges"));
              return;
            }
            await edit.mutateAsync({
              meaning_id: meaning.meaning_id,
              reason: data.reason,
              captchaToken,
              ...(dirtyFields.meaning && { meaning: data.meaning }),
              ...(dirtyFields.sentence && { sentence: data.sentence }),
              ...(dirtyFields.partOfSpeechId &&
                data.partOfSpeechId && {
                  part_of_speech_id: Number(data.partOfSpeechId),
                }),
              ...(dirtyFields.authorId &&
                data.authorId && { author_id: Number(data.authorId) }),
              ...(dirtyFields.attributes && {
                attributes: data.attributes?.map(Number),
              }),
            });
          }
        } catch {
          /* Mutation errors are announced by the mutation callback; retain form values. */
        }
      })}
    >
      <FormDraft
        identity={`meaning:${meaning.meaning_id}:${operation}`}
        control={control}
        reset={reset}
        baseline={baseline}
      />
      {operation === "remove" ? (
        <p>{meaning.meaning}</p>
      ) : (
        <>
          <Controller
            name="meaning"
            control={control}
            render={({ field, fieldState }) => (
              <CustomTextarea
                {...field}
                label={t("Meaning")}
                isInvalid={!!fieldState.error}
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <PartOfSpeechInput
            control={control as never}
            partOfSpeeches={
              parts.data?.map((item) => ({ ...item, id: String(item.id) })) ??
              []
            }
            meaningPartOfSpeechIsLoading={parts.isLoading}
          />
          <MeaningAuthorInput
            control={control as never}
            meaningAuthors={authors.data ?? []}
            meaningAuthorsIsLoading={authors.isLoading}
          />
          <MeaningAttributesInput
            control={control as never}
            meaningAttributes={
              attributes.data?.map((item) => ({
                ...item,
                id: String(item.id),
              })) ?? []
            }
            meaningAttributesIsLoading={attributes.isLoading}
          />
          <Controller
            name="sentence"
            control={control}
            render={({ field }) => (
              <CustomTextarea {...field} label={t("ExampleSentence")} />
            )}
          />
        </>
      )}
      <Controller
        name="reason"
        control={control}
        render={({ field, fieldState }) => (
          <CustomTextarea
            {...field}
            label={t("Requests.Reason")}
            isRequired
            isInvalid={!!fieldState.error}
            errorMessage={fieldState.error?.message}
          />
        )}
      />
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
        <TaskCancel />
        <Button type="submit" color="primary" isLoading={pending}>
          {t("Submit")}
        </Button>
      </div>
    </form>
  );
}
