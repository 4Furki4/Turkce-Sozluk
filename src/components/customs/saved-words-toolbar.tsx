"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { SavedWordsSort } from "@/src/lib/saved-words-input";
import { CustomInput } from "./heroui/custom-input";
import { CustomSelect } from "./heroui/custom-select";

export type AlphabetOrder = "az" | "za";
export type DateOrder = "dateAsc" | "dateDesc";
interface SavedWordsToolbarProps {
  search: string;
  sort: SavedWordsSort;
  disabled?: boolean;
  onSearch: (value: string) => void;
  onSort: (value: SavedWordsSort) => void;
}

export default function SavedWordsToolbar({ search, sort, disabled, onSearch, onSort }: SavedWordsToolbarProps) {
  const t = useTranslations("SavedWords.Library");
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    if (draft === search) return;
    const timeout = setTimeout(() => onSearch(draft), 300);
    return () => clearTimeout(timeout);
  }, [draft, search, onSearch]);

  return <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
    <CustomInput type="search" label={t("searchLabel")} labelPlacement="outside" placeholder={t("searchPlaceholder")}
      value={draft} onValueChange={setDraft} maxLength={255} isDisabled={disabled}
      startContent={<Search size={18} aria-hidden className="shrink-0 text-muted-foreground" />}
      classNames={{ inputWrapper: "h-12 min-h-12 border border-border bg-background/40 shadow-none", input: "text-base" }} />
    <CustomSelect label={t("sortLabel")} labelPlacement="outside" size="lg" disallowEmptySelection selectedKeys={[sort]} isDisabled={disabled}
      onChange={(event) => onSort(event.target.value as SavedWordsSort)}
      options={{ dateDesc: t("sortNewest"), dateAsc: t("sortOldest"), az: t("sortAZ"), za: t("sortZA") }}
      classNames={{ trigger: "h-12 min-h-12 border border-border bg-background/40 px-3 shadow-none", label: "text-sm", value: "text-base" }} />
  </div>;
}
