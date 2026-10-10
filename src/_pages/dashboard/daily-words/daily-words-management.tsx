"use client";

import { useEffect, useRef, useState } from "react";
import { ModalHeader, ModalBody, ModalFooter, Button, AutocompleteItem } from "@heroui/react";
import { useTranslations } from "next-intl";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { CustomAutocomplete } from "@/src/components/customs/heroui/custom-autocomplete";

export interface DailyWordsManagementProps {
  onClose: () => void;
  initialData?: { id?: number; wordId: number; wordName?: string; date: string } | null;
}

export default function DailyWordsManagement({ onClose, initialData }: DailyWordsManagementProps) {
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
  const createMutation = api.admin.dailyWords.addDailyWord.useMutation({
    onSuccess: () => { toast.success(t("added")); onClose(); },
    onError: () => toast.error(t("saveFailed")),
  });
  const updateMutation = api.admin.dailyWords.updateDailyWord.useMutation({
    onSuccess: () => { toast.success(t("updated")); onClose(); },
    onError: () => toast.error(t("saveFailed")),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!date || !selectedWordId) { toast.error(t("required")); return; }
    const payload = { wordId: Number(selectedWordId), date };
    if (initialData?.id) updateMutation.mutate({ ...payload, id: initialData.id });
    else createMutation.mutate(payload);
  }}>
    <ModalHeader>{initialData ? t("edit") : t("add")}</ModalHeader>
    <ModalBody className="gap-4">
      <CustomInput type="date" label={t("date")} value={date} onValueChange={setDate} isRequired />
      <CustomAutocomplete
        label={t("word")} placeholder={t("searchWord")} selectedKey={selectedWordId}
        inputValue={searchTerm} onInputChange={(value) => { hasTyped.current = true; setSearchTerm(value); }}
        onSelectionChange={(key) => {
          setSelectedWordId(key == null ? null : String(key));
          const item = items.find((item) => String(item.id) === String(key));
          if (item) setSearchTerm(item.word);
        }}
        isLoading={isSearchLoading || isInitialLoading} isRequired
      >
        {items.map((item) => <AutocompleteItem key={String(item.id)} textValue={item.word}>{item.word}</AutocompleteItem>)}
      </CustomAutocomplete>
    </ModalBody>
    <ModalFooter>
      <Button variant="light" onPress={onClose}>{t("cancel")}</Button>
      <Button type="submit" color="primary" isLoading={isPending}>{t("save")}</Button>
    </ModalFooter>
  </form>;
}
