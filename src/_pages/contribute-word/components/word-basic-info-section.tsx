"use client";

import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";

import { CustomInput } from "@/src/components/customs/heroui/custom-input";

export interface WordBasicInfoSectionProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  section?: "name" | "metadata" | "all";
}

export default function WordBasicInfoSection({ control, errors, section = "all" }: WordBasicInfoSectionProps) {
  const t = useTranslations("ContributeWord");

  return (
    <div className="space-y-6">
      {/* Word Name */}
      {section !== "metadata" && <Controller
        name="name"
        control={control}
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
      />}

      {/* Phonetic, Prefix, Root, Suffix Row */}
      {section !== "name" && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phonetic */}
        <Controller
          name="phonetic"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              {...field}
              label={t("phonetic")}
              description={t("phoneticHelp")}
              placeholder={t("phoneticPlaceholder")}
              isInvalid={!!error}
              errorMessage={error?.message}
            />
          )}
        />

        {/* Prefix */}
        <Controller
          name="prefix"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              {...field}
              label={t("prefix")}
              description={t("prefixHelp")}
              placeholder={t("prefixPlaceholder")}
              isInvalid={!!error}
              errorMessage={error?.message}
            />
          )}
        />

        {/* Root */}
        <Controller
          name="root"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              {...field}
              label={t("root")}
              description={t("rootHelp")}
              placeholder={t("rootPlaceholder")}
              isInvalid={!!error}
              errorMessage={error?.message}
            />
          )}
        />

        {/* Suffix */}
        <Controller
          name="suffix"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              {...field}
              label={t("suffix")}
              description={t("suffixHelp")}
              placeholder={t("suffixPlaceholder")}
              isInvalid={!!error}
              errorMessage={error?.message}
            />
          )}
        />
      </div>}
    </div>
  );
}
