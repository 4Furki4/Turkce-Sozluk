"use client";

import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { Button, SelectItem, Tooltip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ChevronRight, Plus, Trash2, FileClock } from "lucide-react";
import { useSnapshot } from "valtio";

import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import { preferencesState } from "@/src/store/preferences";
import { cn } from "@/lib/utils";
import MeaningExampleSection from "./meaning-example-section";
import ImageUploadSection from "./image-upload-section";
import { CustomSelect } from "@/src/components/customs/heroui/custom-flexable-select";

export interface PartOfSpeech {
  id: number;
  name: string;
}

export interface MeaningAttribute {
  id: number;
  attribute: string;
}

export interface Author {
  id: number;
  name: string;
}

export interface MeaningFormSectionProps {
  meaningIndex: number;
  control: Control<any>;
  errors: FieldErrors<any>;
  partsOfSpeech?: PartOfSpeech[];
  partsOfSpeechIsLoading: boolean;
  meaningAttributesWithRequested?: MeaningAttribute[];
  meaningAttributesWithRequestedIsLoading: boolean;
  authorsWithRequested?: Author[];
  authorsWithRequestedIsLoading: boolean;
  requestedAuthors: string[];
  imagePreviewUrl?: string;
  onOpenMeaningAttributeModal: () => void;
  onOpenAuthorModal: () => void;
  onImageSelect: (file: File, meaningIndex: number) => void;
  onRemoveImage: (meaningIndex: number) => void;
  onRemoveMeaning: (index: number) => void;
}

export default function MeaningFormSection({
  meaningIndex,
  control,
  errors,
  partsOfSpeech,
  partsOfSpeechIsLoading,
  meaningAttributesWithRequested,
  meaningAttributesWithRequestedIsLoading,
  authorsWithRequested,
  authorsWithRequestedIsLoading,
  requestedAuthors,
  imagePreviewUrl,
  onOpenMeaningAttributeModal,
  onOpenAuthorModal,
  onImageSelect,
  onRemoveImage,
  onRemoveMeaning,
}: MeaningFormSectionProps) {
  const t = useTranslations("ContributeWord");
  const tRequests = useTranslations("Requests");
  const { isBlurEnabled } = useSnapshot(preferencesState);

  // Sort parts of speech alphabetically
  const sortedPartsOfSpeech = partsOfSpeech
    ? [...partsOfSpeech].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Sort meaning attributes alphabetically
  const sortedMeaningAttributes = React.useMemo(
    () => meaningAttributesWithRequested
      ? [...meaningAttributesWithRequested].sort((a, b) => a.attribute.localeCompare(b.attribute))
      : [],
    [meaningAttributesWithRequested]
  );

  // Sort authors alphabetically
  const sortedAuthors = authorsWithRequested
    ? [...authorsWithRequested].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const meaningErrors = (errors.meanings as any)?.[meaningIndex];
  const hasOptionalErrors = Boolean(meaningErrors?.partOfSpeechId || meaningErrors?.attributes || meaningErrors?.example || meaningErrors?.image);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">{t("meaning")} {meaningIndex + 1}</h4>
        {meaningIndex > 0 && (
          <Button
            type="button"
            color="danger"
            variant="light"
            isIconOnly
            aria-label={t("removeMeaning", { number: meaningIndex + 1 })}
            className="h-11 min-w-11"
            onPress={() => onRemoveMeaning(meaningIndex)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      {/* Meaning Text */}
      <Controller
        name={`meanings.${meaningIndex}.meaning`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <CustomTextarea
            {...field}
            color="default"
            classNames={{
              inputWrapper: cn(
                "rounded-md border-2 border-foreground/35 shadow-none group-data-[hover=true]:border-foreground/55 group-data-[focus=true]:border-primary group-data-[focus=true]:data-[hover=true]:border-primary group-data-[invalid=true]:border-danger",
                isBlurEnabled && "backdrop-blur-xs",
              ),
            }}
            label={t("meaningText")}
            placeholder={t("meaningTextPlaceholder")}
            isRequired
            isInvalid={!!error}
            errorMessage={error?.message}
          />
        )}
      />
      <details className="group/meaning-details" open={hasOptionalErrors || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm py-2 text-sm font-medium text-foreground/75 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 group-open/meaning-details:rotate-90" aria-hidden />
          {t("meaningDetails")}
        </summary>
        <div className="mt-2 space-y-5 border-t border-divider pt-4">
          <p className="text-sm text-muted-foreground">{t("meaningDetailsHelp")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Part of Speech */}
            <Controller
              name={`meanings.${meaningIndex}.partOfSpeechId`}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <CustomSelect
                  {...field}
                  classNames={{
                    base: "w-full max-w-none sm:max-w-none",
                    trigger: "h-12 min-h-12",
                    mainWrapper: "h-12",
                  }}
                  isLoading={partsOfSpeechIsLoading}
                  label={t("partOfSpeech")}
                  labelPlacement="outside"
                  size="md"
                  placeholder={t("selectPartOfSpeech")}
                  isInvalid={!!error}
                  errorMessage={error?.message}
                  items={sortedPartsOfSpeech.map((pos) => ({
                    key: pos.id.toString(),
                    label: pos.name
                  }))}
                >
                  {sortedPartsOfSpeech.map((pos) => (
                    <SelectItem key={pos.id.toString()}>
                      {pos.name}
                    </SelectItem>
                  )) || []}
                </CustomSelect>
              )}
            />

            {/* Meaning Attributes */}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <Controller
                name={`meanings.${meaningIndex}.attributes`}
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <CustomSelect
                    items={sortedMeaningAttributes || []}
                    label={t("meaningAttributes")}
                    labelPlacement="outside"
                    size="md"
                    placeholder={t("selectMeaningAttributes")}
                    selectionMode="multiple"
                    selectedKeys={new Set(value)}
                    onSelectionChange={(keys) => onChange(Array.from(keys))}
                    isLoading={meaningAttributesWithRequestedIsLoading}
                    isInvalid={!!error}
                    errorMessage={error?.message}
                    classNames={{
                      base: "min-w-0 w-full max-w-none sm:max-w-none",
                      trigger: "h-12 min-h-12",
                      mainWrapper: "h-12"
                    }}
                    as={"div"}

                  >
                    {(attr) => (
                      <SelectItem
                        endContent={Number(attr.id) < 0 ? (
                          <Tooltip content={tRequests("RequestedAttributeByYou")}>
                            <FileClock className="text-warning" />
                          </Tooltip>
                        ) : ""}
                        key={attr.id.toString()}
                      >
                        {attr.attribute}
                      </SelectItem>
                    )}
                  </CustomSelect>
                )}
              />
              <Button type="button" isIconOnly aria-label={t("requestMeaningAttribute")} variant="flat" color="primary" onPress={onOpenMeaningAttributeModal} className="h-12 min-w-12 shrink-0">
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          {/* Example Section */}
          <MeaningExampleSection
            meaningIndex={meaningIndex}
            control={control}
            errors={errors}
            authorsWithRequested={sortedAuthors}
            authorsWithRequestedIsLoading={authorsWithRequestedIsLoading}
            requestedAuthors={requestedAuthors}
            onOpenAuthorModal={onOpenAuthorModal}
          />

          {/* Image Upload */}
          <ImageUploadSection
            meaningIndex={meaningIndex}
            imagePreviewUrl={imagePreviewUrl}
            onImageSelect={onImageSelect}
            onRemoveImage={onRemoveImage}
          />

        </div>
      </details>
    </div>
  );
}
