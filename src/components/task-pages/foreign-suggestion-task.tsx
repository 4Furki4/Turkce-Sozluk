"use client";
import { CustomInput as Input } from "@/src/components/customs/heroui/custom-input";
import { CustomTextarea as Textarea } from "@/src/components/customs/heroui/custom-textarea";
import { CustomAutocomplete as Autocomplete } from "@/src/components/customs/heroui/custom-autocomplete";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { Button, AutocompleteItem, Checkbox } from "@heroui/react";
import { useRouter } from "@/src/i18n/routing";

import {
  TaskPage,
  useTaskActions,
} from "@/src/components/task-pages/task-page";
import { FormDraft } from "@/src/hooks/use-task-draft";
const suggestionSchema = z
  .object({
    foreignTerm: z.string().min(1, "Error.foreignTermRequired"),
    languageId: z.string().min(1, "Error.languageRequired"),
    foreignMeaning: z.string().min(1, "Error.meaningRequired"),
    suggestedTurkishWord: z.string().min(1, "Error.turkishWordRequired"),
    isNewWord: z.boolean().default(true),
    reason: z.string().optional(),
    existingWordId: z.string().optional(),
    existingSearch: z.string().optional(),
  })
  .refine((value) => value.isNewWord || !!value.existingWordId, {
    path: ["suggestedTurkishWord"],
    message: "Error.turkishWordRequired",
  });

type SuggestionFormValues = z.infer<typeof suggestionSchema>;

export function ForeignSuggestionTask() {
  const t = useTranslations("TaskPage");
  return (
    <TaskPage
      title={t("foreignSuggestion")}
      parent="/foreign-term-suggestions"
      parentLabel={t("foreignSuggestion")}
    >
      <ForeignSuggestionForm />
    </TaskPage>
  );
}
function ForeignSuggestionForm() {
  const { complete, cancel } = useTaskActions();
  const t = useTranslations("ForeignTermSuggestions.form");
  const tError = useTranslations("Errors");
  const tShared = useTranslations("SharedUI");
  const tGlobal = useTranslations("Navbar");
  const utils = api.useUtils();
  const router = useRouter();
  const locale = useLocale();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      isNewWord: true,
      existingWordId: "",
      existingSearch: "",
      foreignTerm: "",
      languageId: "",
      foreignMeaning: "",
      suggestedTurkishWord: "",
      reason: "",
    },
  });

  // Watch isNewWord to conditionally render input
  const isNewWord = useWatch({ control, name: "isNewWord" });

  // Word search state for existing words
  const wordSearchTerm = useWatch({ control, name: "existingSearch" }) ?? "";
  const selectedId = useWatch({ control, name: "existingWordId" });
  const selectedName = useWatch({ control, name: "suggestedTurkishWord" });
  const { data: wordSearchResults, isLoading: wordSearchLoading } =
    api.word.searchWordsSimple.useQuery(
      { query: wordSearchTerm, limit: 20 },
      { enabled: wordSearchTerm.length > 1 && !isNewWord },
    );

  const wordItems = [
    ...(selectedId && selectedName
      ? [{ id: Number(selectedId), word: selectedName }]
      : []),
    ...(wordSearchResults?.words ?? []).filter(
      (item) => String(item.id) !== selectedId,
    ),
  ];

  // Fetch languages for dropdown
  const { data: languages, isLoading: languagesLoading } =
    api.foreignTermSuggestion.getLanguages.useQuery();

  const createSuggestion = api.foreignTermSuggestion.create.useMutation({
    onSuccess: () => {
      toast.success(t("submitSuccess"));
      utils.foreignTermSuggestion.list.invalidate();
      complete();
      reset();
    },
    onError: (error) => {
      toast.error(tError(error.message as any));
    },
  });

  const onSubmit = async (data: SuggestionFormValues) => {
    if (createSuggestion.isPending) return;
    const { existingWordId, existingSearch, ...payload } = data;
    createSuggestion.mutate({
      ...payload,
      languageId: parseInt(data.languageId, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormDraft
        identity="foreign-suggestion:new"
        control={control}
        reset={reset}
        baseline={{
          foreignTerm: "",
          languageId: "",
          foreignMeaning: "",
          suggestedTurkishWord: "",
          isNewWord: true,
          reason: "",
          existingWordId: "",
          existingSearch: "",
        }}
      />
      {/* Foreign Term */}
      <div>
        <label htmlFor="foreignTerm" className="font-semibold">
          {t("foreignTerm")}
        </label>
        <Input
          id="foreignTerm"
          {...register("foreignTerm")}
          placeholder={t("foreignTermPlaceholder")}
          className="mt-2"
        />
        {errors.foreignTerm && (
          <p className="text-red-500 text-sm mt-1">
            {t(errors.foreignTerm.message as any)}
          </p>
        )}
      </div>

      {/* Language */}
      <div>
        <Controller
          name="languageId"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <Autocomplete
              radius="md"
              label={t("language")}
              placeholder={t("selectLanguage")}
              labelPlacement="outside"
              isLoading={languagesLoading}
              defaultItems={languages || []}
              selectedKey={field.value || null}
              onSelectionChange={(key) => {
                field.onChange(key?.toString() || "");
              }}
              classNames={{
                listboxWrapper: "rounded-md",
                popoverContent: "rounded-md",
                base: "rounded-md mt-2 sm:max-w-none",
              }}
              errorMessage={error?.message ? t(error.message as any) : ""}
              isInvalid={error !== undefined}
            >
              {(item) => (
                <AutocompleteItem key={item.id.toString()}>
                  {locale === "en" ? item.language_en : item.language_tr}
                </AutocompleteItem>
              )}
            </Autocomplete>
          )}
        />
      </div>

      {/* Meaning */}
      <div>
        <label htmlFor="foreignMeaning" className="font-semibold">
          {t("meaning")}
        </label>
        <Textarea
          id="foreignMeaning"
          {...register("foreignMeaning")}
          placeholder={t("meaningPlaceholder")}
          minRows={3}
          className="mt-2"
        />
        {errors.foreignMeaning && (
          <p className="text-red-500 text-sm mt-1">
            {t(errors.foreignMeaning.message as any)}
          </p>
        )}
      </div>

      {/* Is New Word Checkbox - moved before Turkish word input */}
      <div>
        <Controller
          name="isNewWord"
          control={control}
          render={({ field }) => (
            <Checkbox
              isSelected={field.value}
              onValueChange={(checked) => {
                field.onChange(checked);
                // Clear the word field when switching
                setValue("suggestedTurkishWord", "");
                setValue("existingSearch", "", { shouldDirty: true });
                setValue("existingWordId", "", { shouldDirty: true });
              }}
            >
              {t("isNewWord")}
            </Checkbox>
          )}
        />
        <p className="text-muted-foreground text-sm mt-1">
          {t("isNewWordDescription")}
        </p>
      </div>

      {/* Turkish Word - conditional based on isNewWord */}
      <div>
        {isNewWord ? (
          // New word: show regular input
          <>
            <label htmlFor="suggestedTurkishWord" className="font-semibold">
              {t("turkishWord")}
            </label>
            <Input
              id="suggestedTurkishWord"
              {...register("suggestedTurkishWord")}
              placeholder={t("turkishWordPlaceholder")}
              className="mt-2"
            />
          </>
        ) : (
          // Existing word: show autocomplete
          <Controller
            name="existingWordId"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Autocomplete
                radius="md"
                label={t("turkishWord")}
                allowsCustomValue
                listboxProps={{ emptyContent: tShared("NoRows") }}
                placeholder={t("existingWordPlaceholder")}
                labelPlacement="outside"
                isLoading={wordSearchLoading}
                inputValue={wordSearchTerm}
                selectedKey={field.value || null}
                onInputChange={(value) => {
                  if (
                    value !== getValues("existingSearch") &&
                    value !== getValues("suggestedTurkishWord")
                  ) {
                    field.onChange("");
                    setValue("suggestedTurkishWord", "", { shouldDirty: true });
                  }
                  setValue("existingSearch", value, { shouldDirty: true });
                }}
                onSelectionChange={(key) => {
                  field.onChange(key == null ? "" : String(key));
                  const selectedWord = wordItems.find(
                    (item) => String(item.id) === String(key),
                  );
                  setValue("suggestedTurkishWord", selectedWord?.word ?? "", {
                    shouldDirty: true,
                  });
                  if (selectedWord) setValue("existingSearch", selectedWord.word, {
                      shouldDirty: true,
                    });
                }}
                classNames={{
                  listboxWrapper: "rounded-md",
                  popoverContent: "rounded-md",
                  base: "rounded-md mt-2 sm:max-w-none",
                }}
                errorMessage={error?.message ? t(error.message as any) : ""}
                isInvalid={error !== undefined}
              >
                {wordItems.map((item: any) => (
                  <AutocompleteItem key={item.id} textValue={String(item.word)}>
                    {item.word}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            )}
          />
        )}
        {errors.suggestedTurkishWord && (
          <p className="text-red-500 text-sm mt-1">
            {t(errors.suggestedTurkishWord.message as any)}
          </p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label htmlFor="reason" className="font-semibold">
          {t("reason")}
        </label>
        <Textarea
          id="reason"
          {...register("reason")}
          placeholder={t("reasonPlaceholder")}
          minRows={2}
          className="mt-2"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onPress={cancel}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          color="primary"
          isLoading={isSubmitting || createSuggestion.isPending}
        >
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
