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

interface DailyWordsManagementProps {
    onClose: () => void;
    initialData?: {
        id?: number;
        wordId: number;
        date: string;
    } | null;
}

export default function DailyWordsManagement({
    onClose,
    initialData,
}: DailyWordsManagementProps) {
    const [date, setDate] = useState(initialData?.date || "");
    const [selectedWordId, setSelectedWordId] = useState<string | number | null>(
        initialData?.wordId ? String(initialData.wordId) : null
    );
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch words for autocomplete
    const { data: searchResults, isLoading: isSearchLoading } =
        api.word.searchWordsSimple.useQuery(
            { query: searchTerm, limit: 20 },
            { enabled: searchTerm.length > 1 }
        );

    // If editing, we might need to fetch the initial word name if not available
    // But for simplicity, we'll rely on the user searching or the ID being present.
    // Ideally, we'd fetch the word details by ID to show the name initially.
    const { data: initialWord } = api.word.getWordById.useQuery(
        { id: Number(selectedWordId) },
        { enabled: !!selectedWordId && !searchTerm }
    );

    const createMutation = api.admin.dailyWords.addDailyWord.useMutation({
        onSuccess: () => {
            toast.success("Daily word added successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.dailyWords.updateDailyWord.useMutation({
        onSuccess: () => {
            toast.success("Daily word updated successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = () => {
        if (!date || !selectedWordId) {
            toast.error("Please fill in all fields");
            return;
        }

        const payload = {
            wordId: Number(selectedWordId),
            date: date,
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
                {initialData ? "Edit Daily Word" : "Add Daily Word"}
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
                    <Input
                        type="date"
                        label="Date"
                        placeholder="Select date"
                        value={date}
                        onValueChange={setDate}
                        isRequired
                    />
                    <Autocomplete
                        label="Word"
                        placeholder="Search for a word"
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
