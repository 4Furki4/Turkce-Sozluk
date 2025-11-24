"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownAZ, ArrowDownZA } from "lucide-react";
import { useTranslations } from "next-intl";
import { preferencesState } from "@/src/store/preferences";
import { useSnapshot } from "valtio";
import { cn } from "@/src/lib/utils";
import { CustomInput } from "./heroui/custom-input";
import { CustomSelect, OptionsMap } from "./heroui/custom-select";

export type ViewType = "list" | "grid";
export type AlphabetOrder = "az" | "za";
export type DateOrder = "dateAsc" | "dateDesc";

interface SavedWordsToolbarProps {
  onSearch: (value: string) => void;
  onAlphabetSort: (sort: AlphabetOrder) => void;
  onDateSort: (sort: DateOrder) => void;
  perPage: number;
  onPerPageChange: (value: number) => void;
}
const alphabetOptions = [
  { key: "az", label: "AZ" },
  { key: "za", label: "ZA" }
]
const dateOptions = [
  { key: "dateAsc", label: "OldToNew" },
  { key: "dateDesc", label: "NewToOld" }
]
const wordPerPageOptions = [
  {
    label: "6",
    key: "6"
  },
  {
    label: "12",
    key: "12"
  },
  {
    label: "24",
    key: "24"
  },
  {
    label: "48",
    key: "48"
  }
]
export default function SavedWordsToolbar({ onSearch, onAlphabetSort, onDateSort, perPage, onPerPageChange }: SavedWordsToolbarProps) {
  const t = useTranslations("SavedWords.Toolbar");
  const [search, setSearch] = useState("");
  const [sortAlphabet, setSortAlphabet] = useState<AlphabetOrder>("az");
  const [sortDate, setSortDate] = useState<DateOrder>("dateDesc");
  const { isBlurEnabled } = useSnapshot(preferencesState);
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search, onSearch]);

  return (
    <div className={cn("grid md:grid-cols-2 lg:grid-cols-4 items-center gap-4 px-4 py-2 bg-background/20 border-2 border-border rounded-sm")}>
      <div className="w-full">
        <CustomInput
          value={search}
          onValueChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
      </div>
      <div className="w-full">
        <CustomSelect
          classNames={{
            base: "w-full"
          }}
          label={t("sortAlphabet")}
          options={alphabetOptions.reduce((acc, option) => {
            acc[option.key] = option.label;
            return acc;
          }, {} as OptionsMap)}
          placeholder={t("sortPlaceholder")}
          startContent={sortAlphabet === "az" ? <ArrowDownAZ /> : <ArrowDownZA />}
          defaultSelectedKeys={["az"]}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value as AlphabetOrder;
            setSortAlphabet(val);
            onAlphabetSort(val);
          }}
        />
      </div>
      <div className="w-full">
        <CustomSelect
          classNames={{
            base: "w-full"
          }}
          label={t("sortDate")}
          options={dateOptions.reduce((acc, option) => {
            acc[option.key] = t(option.label);
            return acc;
          }, {} as OptionsMap)}
          placeholder={t("sortPlaceholder")}
          defaultSelectedKeys={["dateDesc"]}
          onChange={(e) => {
            const val = (e.target as HTMLSelectElement).value as DateOrder;
            setSortDate(val);
            onDateSort(val);
          }}
        />
      </div>
      <div className="w-full">
        <CustomSelect
          classNames={{
            base: "w-full"
          }}
          label={t("pagination.wordsPerPage")}
          options={wordPerPageOptions.reduce((acc, option) => {
            acc[option.key] = option.label;
            return acc;
          }, {} as OptionsMap)}
          placeholder={t("pagination.wordsPerPage")}
          defaultSelectedKeys={[wordPerPageOptions.find((option) => option.key === perPage.toString())?.key ?? perPage.toString()]}
          onChange={(e) => onPerPageChange(Number((e.target as HTMLSelectElement).value))}
        />
      </div>
    </div>
  );
}
