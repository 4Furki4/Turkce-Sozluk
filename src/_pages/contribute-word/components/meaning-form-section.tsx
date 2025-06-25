"use client";

import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { Button, AutocompleteItem, Tooltip, Divider } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, FileClock } from "lucide-react";

import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { CustomTextarea } from "@/src/components/customs/heroui/custom-textarea";
import MeaningExampleSection from "./meaning-example-section";
import ImageUploadSection from "./image-upload-section";

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
  requestedMeaningAttributes: string[];
  requestedAuthors: string[];
  imagePreviewUrl?: string;
  onOpenMeaningAttributeModal: () => void;
  onOpenAuthorModal: () => void;
  onImageSelect: (file: File, meaningIndex: number) => void;
  onRemoveImage: (meaningIndex: number) => void;
  onAddMeaning: () => void;
  onRemoveMeaning: (index: number) => void;
  isLastMeaning: boolean;
  isFirstMeaning: boolean;
  totalMeanings: number;
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
  requestedMeaningAttributes,
  requestedAuthors,
  imagePreviewUrl,
  onOpenMeaningAttributeModal,
  onOpenAuthorModal,
  onImageSelect,
  onRemoveImage,
  onAddMeaning,
  onRemoveMeaning,
  isLastMeaning,
  isFirstMeaning,
  totalMeanings,
}: MeaningFormSectionProps) {
  const t = useTranslations("ContributeWord");
  const tRequests = useTranslations("Requests");

  // Sort parts of speech alphabetically
  const sortedPartsOfSpeech = partsOfSpeech
    ? [...partsOfSpeech].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Sort meaning attributes alphabetically
  const sortedMeaningAttributes = meaningAttributesWithRequested
    ? [...meaningAttributesWithRequested].sort((a, b) => a.attribute.localeCompare(b.attribute))
    : [];

  // Sort authors alphabetically
  const sortedAuthors = authorsWithRequested
    ? [...authorsWithRequested].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div key={meaningIndex} className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">{t("meaning")} {meaningIndex + 1}</h4>
        {!isFirstMeaning && (
          <Button
            type="button"
            color="danger"
            variant="light"
            size="sm"
            onPress={() => onRemoveMeaning(meaningIndex)}
          >
            <Trash2 className="h-4 w-4" />
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
            label={t("meaningText")}
            placeholder={t("meaningTextPlaceholder")}
            isRequired
            isInvalid={!!error}
            errorMessage={error?.message}
          />
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Part of Speech */}
        <Controller
          name={`meanings.${meaningIndex}.partOfSpeechId`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomAutocomplete
              {...field}
              classNames={{
                base: "w-full",
              }}
              isLoading={partsOfSpeechIsLoading}
              label={t("partOfSpeech")}
              placeholder={t("selectPartOfSpeech")}
              isInvalid={!!error}
              errorMessage={error?.message}
              items={sortedPartsOfSpeech.map((pos) => ({
                key: pos.id.toString(),
                label: pos.name
              }))}
            >
              {sortedPartsOfSpeech.map((pos) => (
                <AutocompleteItem key={pos.id.toString()}>
                  {pos.name}
                </AutocompleteItem>
              )) || []}
            </CustomAutocomplete>
          )}
        />

        {/* Meaning Attributes */}
        <Controller
          name={`meanings.${meaningIndex}.attributes`}
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomAutocomplete
              {...field}
              classNames={{
                base: "w-full",
              }}
              isLoading={meaningAttributesWithRequestedIsLoading}
              label={t("meaningAttributes")}
              placeholder={t("selectMeaningAttributes")}
              isInvalid={!!error}
              errorMessage={error?.message}
              items={sortedMeaningAttributes.map((attr) => ({
                key: attr.id.toString(),
                label: attr.attribute
              }))}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onOpenMeaningAttributeModal}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            >
              {sortedMeaningAttributes.map((attr) => (
                <AutocompleteItem
                  key={attr.id.toString()}
                  endContent={Number(attr.id) < 0 ? (
                    <Tooltip content={tRequests("RequestedAttributeByYou")}>
                      <FileClock className="text-warning" />
                    </Tooltip>
                  ) : ""}
                >
                  {attr.attribute}
                </AutocompleteItem>
              )) || []}
            </CustomAutocomplete>
          )}
        />
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

      {/* Add another meaning button - only show on last meaning */}
      {isLastMeaning && (
        <>
          <Divider />
          <Button
            type="button"
            variant="ghost"
            onPress={onAddMeaning}
            startContent={<Plus className="h-4 w-4" />}
          >
            {t("addMeaning")}
          </Button>
        </>
      )}
    </div>
  );
}
