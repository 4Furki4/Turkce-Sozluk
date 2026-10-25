"use client";

import { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@heroui/react";
import { AutocompleteItem } from "@heroui/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { InlineSupport } from "@/src/components/task-pages/inline-support";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { CustomSelect } from "@/src/components/customs/heroui/custom-select";
import { api } from "@/src/trpc/react";

const DEBOUNCE_DELAY = 300;

interface WordRecommendation {
  word_id: number;
  name: string;
}

interface RelatedItem {
  id: number;
  name: string;
  relationType: string;
}

interface AddRelatedItemForm {
  relatedWordId: number | undefined;
  relationType: string;
}

interface AddRelatedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: RelatedItem) => void;
  itemType: "word" | "phrase";
}

const relationTypes = [
  { id: "relatedWord", name: "relatedWord" },
  { id: "synonym", name: "synonym" },
  { id: "antonym", name: "antonym" },
  { id: "seeAlso", name: "seeAlso" },
  { id: "compoundWord", name: "compoundWord" },
  { id: "turkishEquivalent", name: "turkishEquivalent" },
];

export default function AddRelatedItemModal({
  isOpen,
  onClose,
  onAddItem,
  itemType,
}: AddRelatedItemModalProps) {
  const t = useTranslations("ContributeWord");
  const tRelationTypes = useTranslations("RelationTypes");
  const [inputValue, setInputValue] = useState("");
  const [debouncedInputValue, setDebouncedInputValue] = useState("");

  // Debounce input value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInputValue(inputValue);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  const { data: wordOptions, isLoading: isLoadingWords } = api.word.getRecommendations.useQuery(
    { query: debouncedInputValue, limit: 10 },
    {
      enabled: debouncedInputValue.trim().length > 1,
    }
  );

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AddRelatedItemForm>({
    defaultValues: {
      relatedWordId: undefined,
      relationType: "",
    },
  });

  const onSubmit = (data: AddRelatedItemForm) => {
    if (!data.relatedWordId || !data.relationType) {
      toast.error(t("pleaseSelectBothFields"));
      return;
    }

    const selectedWord = (wordOptions as WordRecommendation[])?.find(word => word.word_id === data.relatedWordId);
    if (!selectedWord) {
      toast.error(t("selectedWordNotFound"));
      return;
    }

    const newItem: RelatedItem = {
      id: data.relatedWordId,
      name: selectedWord.name,
      relationType: data.relationType,
    };

    onAddItem(newItem);
    reset();
    setInputValue("");
    onClose();
    toast.success(t(`${itemType}AddedSuccessfully`));
  };

  const handleClose = () => {
    reset();
    setInputValue("");
    setDebouncedInputValue("");
    onClose();
  };

  const handleFormSubmit = () => {
    handleSubmit(onSubmit)();
  };

  return <InlineSupport onSubmit={handleFormSubmit} open={isOpen} title={itemType === "word" ? t("addRelatedWord") : t("addRelatedPhrase")}>

              <div className="space-y-4">
                <Controller
                  name="relatedWordId"
                  control={control}
                  rules={{ required: t("fieldRequired") }}
                  render={({ field }) => (
                    <CustomAutocomplete
                      classNames={{
                        base: "w-full",
                      }}
                      label={itemType === "word" ? t("selectRelatedWord") : t("selectRelatedPhrase")}
                      placeholder={t("searchPlaceholder")}
                      defaultItems={(wordOptions as WordRecommendation[]) || []}
                      inputValue={inputValue}
                      onInputChange={setInputValue}
                      selectedKey={field.value !== undefined ? field.value.toString() : null}
                      onSelectionChange={(key) => {
                        field.onChange(key ? parseInt(String(key), 10) : undefined);
                        const selectedWord = (wordOptions as WordRecommendation[])?.find(word => word.word_id.toString() === key)?.name || "";
                        setInputValue(selectedWord);
                      }}
                      isInvalid={!!errors.relatedWordId}
                      errorMessage={errors.relatedWordId?.message}
                      isLoading={isLoadingWords}
                      allowsCustomValue={false}
                      listboxProps={{
                        emptyContent: t("noWordsFound"),
                      }}
                      isRequired
                      onBlur={field.onBlur}
                      name={field.name}
                    >
                      {(item) => (
                        <AutocompleteItem key={(item as WordRecommendation).word_id} textValue={(item as WordRecommendation).name}>
                          {(item as WordRecommendation).name}
                        </AutocompleteItem>
                      )}
                    </CustomAutocomplete>
                  )}
                />

                <Controller
                  name="relationType"
                  control={control}
                  rules={{ required: t("fieldRequired") }}
                  render={({ field }) => {
                    const relationTypeOptions = relationTypes.reduce((acc, type) => {
                      acc[type.id] = tRelationTypes(type.name as any);
                      return acc;
                    }, {} as Record<string, string>);

                    return (
                      <CustomSelect
                        classNames={{
                          base: "w-full",
                        }}
                        label={t("relationType")}
                        placeholder={t("selectRelationType")}
                        isInvalid={!!errors.relationType}
                        errorMessage={errors.relationType?.message}
                        selectedKeys={field.value ? [field.value] : []}
                        onSelectionChange={(keys) => field.onChange(Array.from(keys)[0] as string)}
                        options={relationTypeOptions}
                        isRequired
                      />
                    );
                  }}
                />
              </div>

              <Button variant="light" onPress={handleClose}>
                {t("cancel")}
              </Button>
              <Button color="primary" onPress={handleFormSubmit}>
                {t("add")}
              </Button>

</InlineSupport>;
}
