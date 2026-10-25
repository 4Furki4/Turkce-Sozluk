"use client";
import { CustomInput as Input } from "@/src/components/customs/heroui/custom-input";
import { CustomAutocomplete as Autocomplete } from "@/src/components/customs/heroui/custom-autocomplete";
import { useTaskDraft } from "@/src/hooks/use-task-draft";

import React, { useState } from "react";
import {
    Button,
    AutocompleteItem,
} from "@heroui/react";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface MisspellingsManagementProps {
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: {
        id?: number;
        correctWordName?: string;
        correctWordId: number;
        incorrectSpelling: string;
    } | null;
}

export default function MisspellingsManagement({
    onClose,
    onSuccess,
    initialData,
}: MisspellingsManagementProps) {
    const t = useTranslations("Dashboard.Misspellings");
    const [incorrectSpelling, setIncorrectSpelling] = useState(initialData?.incorrectSpelling || "");
    const [selectedWordId, setSelectedWordId] = useState<string | number | null>(
        initialData?.correctWordId ? String(initialData.correctWordId) : null
    );
    const [searchTerm, setSearchTerm] = useState(initialData?.correctWordName || "");

    const { data: searchResults, isLoading: isSearchLoading } =
        api.word.searchWordsSimple.useQuery(
            { query: searchTerm, limit: 20 },
            { enabled: searchTerm.length > 1 }
        );

    const { data: initialWord } = api.word.getWordById.useQuery(
        { id: Number(selectedWordId) },
        { enabled: !!selectedWordId }
    );

    const selectedItem = initialWord
        ? { id: initialWord.id, word: initialWord.name }
        : initialData?.correctWordName && String(initialData.correctWordId) === String(selectedWordId)
          ? { id: initialData.correctWordId, word: initialData.correctWordName }
          : undefined;
    const items = [...(selectedItem ? [selectedItem] : []), ...(searchResults?.words ?? []).filter(item => item.id !== selectedItem?.id)];

  const draft = useTaskDraft("misspellings:" + (initialData?.id ?? "new"), { incorrectSpelling, selectedWordId, searchTerm }, (value) => { setIncorrectSpelling(value.incorrectSpelling); setSelectedWordId(value.selectedWordId); setSearchTerm(value.searchTerm); }, { incorrectSpelling: initialData?.incorrectSpelling || "", selectedWordId: initialData?.correctWordId ? String(initialData.correctWordId) : null, searchTerm: initialData?.correctWordName || "" });
    React.useEffect(() => { if (initialWord && !searchTerm) setSearchTerm(initialWord.name); }, [initialWord]);
    const createMutation = api.admin.misspellings.addMisspelling.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.addedSuccess"));
            (onSuccess ?? onClose)();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.misspellings.updateMisspelling.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.updatedSuccess"));
            (onSuccess ?? onClose)();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = () => {
        if (!incorrectSpelling || !selectedWordId) {
            toast.error(t("toasts.fillAllFields"));
            return;
        }

        const payload = {
            correctWordId: Number(selectedWordId),
            incorrectSpelling,
        };

        if (initialData?.id) {
            updateMutation.mutate({ ...payload, id: initialData.id });
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <form onSubmit={(event) => { event.preventDefault(); if (!createMutation.isPending && !updateMutation.isPending) handleSubmit(); }}>
            {draft.notice}

            <div>
                <div className="flex flex-col gap-4">
                    <Input
                        label={t("incorrectSpellingLabel")}
                        placeholder={t("incorrectSpellingPlaceholder")}
                        value={incorrectSpelling}
                        onValueChange={setIncorrectSpelling}
                        isRequired
                    />
                    <Autocomplete
                        label={t("correctWordLabel")}
                        placeholder={t("correctWordPlaceholder")}
                        selectedKey={selectedWordId ? String(selectedWordId) : null}
                        inputValue={searchTerm}
                        onInputChange={(value) => {
                            setSearchTerm(value);
                            if (value !== items.find(item => String(item.id) === String(selectedWordId))?.word) setSelectedWordId(null);
                        }}
                        onSelectionChange={(key) => {
                            setSelectedWordId(key);
                            const item = items.find(item => String(item.id) === String(key));
                            if (item) setSearchTerm(item.word);
                        }}
                        isLoading={isSearchLoading}
                        isRequired
                    >
                        {items.map((item) => (
                            <AutocompleteItem key={item.id} textValue={String(item.word)}>
                                {item.word}
                            </AutocompleteItem>
                        )) || []}
                    </Autocomplete>
                </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-6">
                <Button color="danger" variant="light" onPress={onClose}>
                    {t("cancel")}
                </Button>
                <Button
                    color="primary"
                    type="submit"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                >
                    {t("save")}
                </Button>
            </div>
        </form>
    );
}
