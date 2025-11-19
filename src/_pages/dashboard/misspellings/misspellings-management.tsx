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
            toast.success("Misspelling added successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.misspellings.updateMisspelling.useMutation({
        onSuccess: () => {
            toast.success("Misspelling updated successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = () => {
        if (!incorrectSpelling || !selectedWordId) {
            toast.error("Please fill in all fields");
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
                {initialData ? "Edit Misspelling" : "Add Misspelling"}
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <Input
                        label="Incorrect Spelling"
                        placeholder="Enter incorrect spelling"
                        value={incorrectSpelling}
                        onValueChange={setIncorrectSpelling}
                        isRequired
                    />
                    <Autocomplete
                        label="Correct Word"
                        placeholder="Search for the correct word"
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
                    Cancel
                </Button>
                <Button
                    color="primary"
                    onPress={handleSubmit}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                >
                    Save
                </Button>
            </ModalFooter>
        </>
    );
}
