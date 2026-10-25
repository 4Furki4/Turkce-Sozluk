"use client";
import { CustomTextarea as Textarea } from "@/src/components/customs/heroui/custom-textarea";
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

interface GalatiMeshurManagementProps {
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: {
        id?: number;
        wordName?: string;
        wordId: number;
        explanation: string;
        correctUsage: string;
    } | null;
}

export default function GalatiMeshurManagement({
    onClose,
    onSuccess,
    initialData,
}: GalatiMeshurManagementProps) {
    const t = useTranslations("Dashboard.GalatiMeshur");
    const [explanation, setExplanation] = useState(initialData?.explanation || "");
    const [correctUsage, setCorrectUsage] = useState(initialData?.correctUsage || "");
    const [selectedWordId, setSelectedWordId] = useState<string | number | null>(
        initialData?.wordId ? String(initialData.wordId) : null
    );
    const [searchTerm, setSearchTerm] = useState(initialData?.wordName || "");

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
        : initialData?.wordName && String(initialData.wordId) === String(selectedWordId)
          ? { id: initialData.wordId, word: initialData.wordName }
          : undefined;
    const items = [...(selectedItem ? [selectedItem] : []), ...(searchResults?.words ?? []).filter(item => item.id !== selectedItem?.id)];

  const draft = useTaskDraft("galatimeshur:" + (initialData?.id ?? "new"), { explanation, correctUsage, selectedWordId, searchTerm }, (value) => { setExplanation(value.explanation); setCorrectUsage(value.correctUsage); setSelectedWordId(value.selectedWordId); setSearchTerm(value.searchTerm); }, { explanation: initialData?.explanation || "", correctUsage: initialData?.correctUsage || "", selectedWordId: initialData?.wordId ? String(initialData.wordId) : null, searchTerm: initialData?.wordName || "" });
    React.useEffect(() => { if (initialWord && !searchTerm) setSearchTerm(initialWord.name); }, [initialWord]);
    const createMutation = api.admin.galatiMeshur.addGalatiMeshur.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.addedSuccess"));
            (onSuccess ?? onClose)();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.galatiMeshur.updateGalatiMeshur.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.updatedSuccess"));
            (onSuccess ?? onClose)();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = () => {
        if (!explanation || !correctUsage || !selectedWordId) {
            toast.error(t("toasts.fillAllFields"));
            return;
        }

        const payload = {
            wordId: Number(selectedWordId),
            explanation,
            correctUsage,
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
                    <Autocomplete
                        label={t("wordLabel")}
                        placeholder={t("wordPlaceholder")}
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
                    <Textarea
                        label={t("explanationLabel")}
                        placeholder={t("explanationPlaceholder")}
                        value={explanation}
                        onValueChange={setExplanation}
                        isRequired
                    />
                    <Textarea
                        label={t("correctUsageLabel")}
                        placeholder={t("correctUsagePlaceholder")}
                        value={correctUsage}
                        onValueChange={setCorrectUsage}
                        isRequired
                    />
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
