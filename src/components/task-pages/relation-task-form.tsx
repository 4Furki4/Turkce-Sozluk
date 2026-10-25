"use client";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, AutocompleteItem, Select, SelectItem } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { api } from "@/src/trpc/react";
import { type WordSearchResult } from "@/types";
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { FormDraft } from "@/src/hooks/use-task-draft";
import { TaskCancel, useTaskActions } from "./task-page";
const relations = [
  "synonym",
  "antonym",
  "relatedWord",
  "seeAlso",
  "compoundWord",
  "turkishEquivalent",
];
export function RelationTaskForm({
  word,
  kind,
  operation,
  childId,
}: {
  word: WordSearchResult["word_data"];
  kind: "related-words" | "related-phrases";
  operation: "new" | "edit" | "remove";
  childId: number;
}) {
  const t = useTranslations();
  const { complete } = useTaskActions();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const words = kind === "related-words";
  const current = word.relatedWords?.find(
    (item) => item.related_word_id === childId,
  );
  const schema = z
    .object({
      targetId: z.number().optional(),
      targetName: z.string(),
      relationType: z.string(),
      reason: z.string().min(15, t("Requests.ReasonMinLength15")),
    })
    .superRefine((value, ctx) => {
      if (
        operation !== "remove" &&
        (!words || operation === "new") &&
        !value.targetId
      )
        ctx.addIssue({
          code: "custom",
          path: ["targetId"],
          message: t("Requests.Forms.RelatedWord.Required"),
        });
      if (words && operation !== "remove" && !value.relationType)
        ctx.addIssue({
          code: "custom",
          path: ["relationType"],
          message: t("Requests.Forms.RelationType.Required"),
        });
    });
  const baseline = {
    targetId: undefined as number | undefined,
    targetName: "",
    relationType: current?.relation_type ?? "relatedWord",
    reason: "",
  };
  const {
    control,
    reset,
    setValue,
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: baseline,
  });
  const search = useWatch({ control, name: "targetName" });
  const targetId = useWatch({ control, name: "targetId" });
  const options = api.word.getRecommendations.useQuery(
    { query: search, limit: 10 },
    { enabled: search.trim().length > 1 },
  );
  const wordOptions = [...(targetId && search ? [{ word_id: targetId, name: search }] : []), ...(options.data ?? []).filter(item => item.word_id !== targetId)];
  const callbacks = {
    onSuccess: () => {
      toast.success(t("TaskPage.submitted"));
      complete();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  };
  const createWord =
    api.request.requestCreateRelatedWord.useMutation(callbacks);
  const editWord = api.request.requestEditRelatedWord.useMutation(callbacks);
  const removeWord =
    api.request.requestDeleteRelatedWord.useMutation(callbacks);
  const createPhrase =
    api.request.requestCreateRelatedPhrase.useMutation(callbacks);
  const editPhrase =
    api.request.requestEditRelatedPhrase.useMutation(callbacks);
  const removePhrase =
    api.request.requestDeleteRelatedPhrase.useMutation(callbacks);
  const pending = [
    createWord,
    editWord,
    removeWord,
    createPhrase,
    editPhrase,
    removePhrase,
  ].some((item) => item.isPending);
  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (data) => {
        if (pending) return;
        if (!executeRecaptcha) {
          toast.error(t("Errors.captchaError"));
          return;
        }
        try {
          const captchaToken = await executeRecaptcha("related_item_request");
          const base = {
            wordId: word.word_id,
            reason: data.reason,
            captchaToken,
          };
          if (words) {
            if (operation === "new")
              await createWord.mutateAsync({
                ...base,
                relatedWordId: data.targetId!,
                relationType: data.relationType,
              });
            else if (operation === "edit")
              await editWord.mutateAsync({
                ...base,
                relatedWordId: childId,
                originalRelationType: current?.relation_type ?? "relatedWord",
                newRelationType: data.relationType,
              });
            else
              await removeWord.mutateAsync({ ...base, relatedWordId: childId });
          } else {
            if (operation === "new")
              await createPhrase.mutateAsync({
                ...base,
                phraseId: data.targetId!,
              });
            else if (operation === "edit")
              await editPhrase.mutateAsync({
                ...base,
                oldRelatedPhraseId: childId,
                newRelatedPhraseId: data.targetId!,
              });
            else
              await removePhrase.mutateAsync({
                wordId: word.word_id,
                relatedPhraseId: childId,
                reason: data.reason,
              });
          }
        } catch {
          /* Keep all values on submission failure. */
        }
      })}
    >
      <FormDraft
        identity={`relation:${word.word_id}:${kind}:${childId || "new"}:${operation}`}
        control={control}
        reset={reset}
        baseline={baseline}
      />
      {operation !== "new" && (
        <p>
          {words
            ? current?.related_word_name
            : word.relatedPhrases?.find(
                (item) => item.related_phrase_id === childId,
              )?.related_phrase}
        </p>
      )}
      {operation !== "remove" && (!words || operation === "new") && (
        <Controller
          name="targetId"
          control={control}
          render={({ field, fieldState }) => (
            <CustomAutocomplete
              allowsCustomValue
              listboxProps={{ emptyContent: t("SharedUI.NoRows") }}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              label={t(
                words ? "Form.relatedWordLabel" : "Form.relatedPhraseWordLabel",
              )}
              inputValue={search}
              onInputChange={(value) => {
                const selected = options.data?.find(
                  (item) => item.word_id === getValues("targetId"),
                );
                if (
                  value !== getValues("targetName") &&
                  value !== selected?.name
                )
                  setValue("targetId", undefined, { shouldDirty: true });
                setValue("targetName", value, { shouldDirty: true });
              }}
              selectedKey={field.value ? String(field.value) : null}
              onSelectionChange={(key) => {
                field.onChange(key ? Number(key) : undefined);
                if (key) setValue(
                  "targetName",
                  wordOptions.find((item) => item.word_id === Number(key))
                    ?.name ?? search,
                  { shouldDirty: true },
                );
              }}
              isLoading={options.isFetching}
              isInvalid={!!fieldState.error}
              errorMessage={fieldState.error?.message}
            >
              {wordOptions
                .filter((item) => item.word_id !== word.word_id)
                .map((item) => (
                  <AutocompleteItem key={item.word_id} textValue={item.name}>
                    {item.name}
                  </AutocompleteItem>
                ))}
            </CustomAutocomplete>
          )}
        />
      )}
      {words && operation !== "remove" && (
        <Controller
          name="relationType"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              {...field}
              label={t("Form.relationTypeLabel")}
              selectedKeys={[field.value]}
              isInvalid={!!fieldState.error}
              errorMessage={fieldState.error?.message}
            >
              {relations.map((item) => (
                <SelectItem key={item}>{t(`RelationTypes.${item}`)}</SelectItem>
              ))}
            </Select>
          )}
        />
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
        <Button
          color="primary"
          type="submit"
          isLoading={pending || isSubmitting}
        >
          {t("Submit")}
        </Button>
      </div>
    </form>
  );
}
