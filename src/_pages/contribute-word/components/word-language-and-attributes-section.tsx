"use client";

import React from "react";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { Button, AutocompleteItem, SelectItem, Tooltip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { Plus, FileClock } from "lucide-react";

import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { CustomSelect } from "@/src/components/customs/heroui/custom-flexable-select";

export interface Language {
  language_code: string;
  language_en: string;
  language_tr: string;
}

export interface WordAttribute {
  id: number;
  attribute: string;
}

export interface WordLanguageAndAttributesSectionProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  languages?: Language[];
  languagesIsLoading: boolean;
  wordAttributesWithRequested?: WordAttribute[];
  wordAttributesWithRequestedIsLoading: boolean;
  requestedAttributes: string[];
  locale: "en" | "tr";
  onOpenAttributeModal: () => void;
}

export default function WordLanguageAndAttributesSection({
  control,
  errors,
  languages,
  languagesIsLoading,
  wordAttributesWithRequested,
  wordAttributesWithRequestedIsLoading,
  requestedAttributes,
  locale,
  onOpenAttributeModal,
}: WordLanguageAndAttributesSectionProps) {
  const t = useTranslations("ContributeWord");
  const tRequests = useTranslations("Requests");

  // State for multi-select attributes
  const [selectedAttributes, setSelectedAttributes] = React.useState<string[]>([]);

  const sortedLanguages = React.useMemo(
    () => languages?.sort((a, b) => {
      const aName = locale === "en" ? a.language_en : a.language_tr;
      const bName = locale === "en" ? b.language_en : b.language_tr;
      return aName.localeCompare(bName);
    }) || [],
    [languages, locale]
  );

  const sortedWordAttributes = React.useMemo(
    () => wordAttributesWithRequested?.sort((a, b) => a.attribute.localeCompare(b.attribute)) || [],
    [wordAttributesWithRequested]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Language */}
      <Controller
        name="languageCode"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <CustomAutocomplete
            onSelectionChange={(key) => field.onChange(key)}
            classNames={{
              base: "w-full",
            }}
            isLoading={languagesIsLoading}
            label={t("language")}
            placeholder={t("selectLanguage")}
            isInvalid={!!error}
            errorMessage={error?.message}
            defaultItems={sortedLanguages.map((lang) => ({
              key: lang.language_code,
              label: locale === "en" ? lang.language_en : lang.language_tr
            }))}
          >
            {sortedLanguages.map((lang) => (
              <AutocompleteItem key={lang.language_code}>
                {locale === "en" ? lang.language_en : lang.language_tr}
              </AutocompleteItem>
            )) || []}
          </CustomAutocomplete>
        )}
      />

      {/* Word Attributes */}
      <div className="flex items-end gap-2">
        <Controller
          name="attributes"
          control={control}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <CustomSelect
              items={sortedWordAttributes || []}
              label={t("attributes")}
              placeholder={t("selectAttributes")}
              selectionMode="multiple"
              selectedKeys={new Set(value)}
              onSelectionChange={(keys) => onChange(Array.from(keys))}
              isLoading={wordAttributesWithRequestedIsLoading}
              isInvalid={!!error}
              errorMessage={error?.message}
              classNames={{
                base: "w-full"
              }}
              as={"div"}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onOpenAttributeModal}
                  className="mb-4"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
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
      </div>
    </div>
  );
}
