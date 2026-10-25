"use client";
import { useTaskDraft } from "@/src/hooks/use-task-draft";

import { useEffect, useRef, useState } from "react";
import { Button, AutocompleteItem } from "@heroui/react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";

export interface DailyWordsManagementProps {
  onClose: () => void;
    onSuccess?: () => void;
  initialData?: { id?: number; wordId: number; wordName?: string; date: string } | null;
}

export default function DailyWordsManagement({ onClose, onSuccess, initialData }: DailyWordsManagementProps) {
  const t = useTranslations("Dashboard.DailyWords");
  const [date, setDate] = useState(initialData?.date || "");
  const [selectedWordId, setSelectedWordId] = useState<string | null>(initialData?.wordId ? String(initialData.wordId) : null);
  const [searchTerm, setSearchTerm] = useState(initialData?.wordName || "");
  const hasTyped = useRef(false);

  const { data: searchResults, isFetching: isSearchLoading } = api.word.searchWordsSimple.useQuery(
    { query: searchTerm, limit: 20 }, { enabled: searchTerm.length > 1 },
  );
  const { data: initialWord, isLoading: isInitialLoading } = api.word.getWordById.useQuery(
    { id: initialData?.wordId ?? 0 }, { enabled: Boolean(initialData?.wordId && !initialData.wordName) },
  );

  useEffect(() => {
    if (initialWord && !hasTyped.current) setSearchTerm(initialWord.name);
  }, [initialWord]);

  const initialItem = initialData?.wordName
    ? { id: initialData.wordId, word: initialData.wordName }
    : initialWord ? { id: initialWord.id, word: initialWord.name } : null;
  const items = [...(initialItem ? [initialItem] : []), ...(searchResults?.words ?? []).filter((item) => item.id !== initialItem?.id)];
  const draft = useTaskDraft("daily-words:" + (initialData?.id ?? "new"), { date, selectedWordId, searchTerm }, (value) => { setDate(value.date); setSelectedWordId(value.selectedWordId); setSearchTerm(value.searchTerm); }, { date: initialData?.date || "", selectedWordId: initialData?.wordId ? String(initialData.wordId) : null, searchTerm: initialData?.wordName || "" });
  const createMutation = api.admin.dailyWords.addDailyWord.useMutation({
    onSuccess: () => { toast.success(t("added")); (onSuccess ?? onClose)(); },
    onError: () => toast.error(t("saveFailed")),
  });
  const updateMutation = api.admin.dailyWords.updateDailyWord.useMutation({
    onSuccess: () => { toast.success(t("updated")); (onSuccess ?? onClose)(); },
    onError: () => toast.error(t("saveFailed")),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  return <form onSubmit={(event) => {
    event.preventDefault();
    if (isPending) return;
    if (!date || !selectedWordId) { toast.error(t("required")); return; }
    const payload = { wordId: Number(selectedWordId), date };
    if (initialData?.id) updateMutation.mutate({ ...payload, id: initialData.id });
    else createMutation.mutate(payload);
  }}>

    {draft.notice}
    <div className="space-y-4">
      <CustomInput type="date" label={t("date")} value={date} onValueChange={setDate} isRequired />
      <CustomAutocomplete
        size="lg" classNames={{ base: "sm:max-w-none" }} label={t("word")} placeholder={t("searchWord")} selectedKey={selectedWordId}
        inputValue={searchTerm} onInputChange={(value) => {
          hasTyped.current = true;
          setSearchTerm(value);
          // Changing the query invalidates the selected ID until an option is chosen.
          if (value !== items.find(item => String(item.id) === selectedWordId)?.word) setSelectedWordId(null);
        }}
        onSelectionChange={(key) => {
          setSelectedWordId(key == null ? null : String(key));
          const item = items.find((item) => String(item.id) === String(key));
          if (item) setSearchTerm(item.word);
        }}
        isLoading={isSearchLoading || isInitialLoading} isRequired
      >
        {items.map((item) => <AutocompleteItem key={String(item.id)} textValue={item.word}>{item.word}</AutocompleteItem>)}
      </CustomAutocomplete>
    </div>
    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-6">
      <Button variant="light" onPress={onClose}>{t("cancel")}</Button>
      <Button type="submit" color="primary" isLoading={isPending}>{t("save")}</Button>
    </div>
  </form>;
}
