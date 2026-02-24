"use client";

import React, { useState } from "react";
import {
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Autocomplete,
    AutocompleteItem,
} from "@heroui/react";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface MisspellingsManagementProps {
    onClose: () => void;
    initialData?: {
        id?: number;
        correctWordId: number;
        incorrectSpelling: string;
    } | null;
}

export default function MisspellingsManagement({
    onClose,
    initialData,
}: MisspellingsManagementProps) {
    const t = useTranslations("Dashboard.Misspellings");
    const [incorrectSpelling, setIncorrectSpelling] = useState(initialData?.incorrectSpelling || "");
    const [selectedWordId, setSelectedWordId] = useState<string | number | null>(
        initialData?.correctWordId ? String(initialData.correctWordId) : null
    );
    const [searchTerm, setSearchTerm] = useState("");

    const { data: searchResults, isLoading: isSearchLoading } =
        api.word.searchWordsSimple.useQuery(
            { query: searchTerm, limit: 20 },
            { enabled: searchTerm.length > 1 }
        );

    const { data: initialWord } = api.word.getWordById.useQuery(
        { id: Number(selectedWordId) },
        { enabled: !!selectedWordId && !searchTerm }
    );

    const createMutation = api.admin.misspellings.addMisspelling.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.addedSuccess"));
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.misspellings.updateMisspelling.useMutation({
        onSuccess: () => {
            toast.success(t("toasts.updatedSuccess"));
            onClose();
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
        <>
            <ModalHeader className="flex flex-col gap-1">
                {initialData ? t("modalTitleEdit") : t("modalTitleAdd")}
            </ModalHeader>
            <ModalBody>
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
                        defaultSelectedKey={selectedWordId ? String(selectedWordId) : undefined}
                        inputValue={searchTerm}
                        onInputChange={setSearchTerm}
                        onSelectionChange={(key) => setSelectedWordId(key)}
                        isLoading={isSearchLoading}
                        isRequired
                    >
                        {(searchTerm.length > 1 ? searchResults?.words : initialWord ? [{ id: initialWord.id, word: initialWord.name }] : [])?.map((item: any) => (
                            <AutocompleteItem key={item.id} textValue={String(item.word)}>
                                {item.word}
                            </AutocompleteItem>
                        )) || []}
                    </Autocomplete>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                    {t("cancel")}
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                >
                    {t("save")}
                </Button>
            </ModalFooter>
        </>
    );
}
