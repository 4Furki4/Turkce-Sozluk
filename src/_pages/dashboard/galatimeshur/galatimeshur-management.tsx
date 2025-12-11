"use client";

import React, { useState } from "react";
import {
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Textarea,
    Autocomplete,
    AutocompleteItem,
} from "@heroui/react";
import { api } from "@/src/trpc/react";
import { toast } from "sonner";

interface GalatiMeshurManagementProps {
    onClose: () => void;
    initialData?: {
        id?: number;
        wordId: number;
        explanation: string;
        correctUsage: string;
    } | null;
}

export default function GalatiMeshurManagement({
    onClose,
    initialData,
}: GalatiMeshurManagementProps) {
    const [explanation, setExplanation] = useState(initialData?.explanation || "");
    const [correctUsage, setCorrectUsage] = useState(initialData?.correctUsage || "");
    const [selectedWordId, setSelectedWordId] = useState<string | number | null>(
        initialData?.wordId ? String(initialData.wordId) : null
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

    const createMutation = api.admin.galatiMeshur.addGalatiMeshur.useMutation({
        onSuccess: () => {
            toast.success("Entry added successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const updateMutation = api.admin.galatiMeshur.updateGalatiMeshur.useMutation({
        onSuccess: () => {
            toast.success("Entry updated successfully");
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = () => {
        if (!explanation || !correctUsage || !selectedWordId) {
            toast.error("Please fill in all fields");
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
        <>
            <ModalHeader className="flex flex-col gap-1">
                {initialData ? "Edit Galatımeşhur" : "Add Galatımeşhur"}
            </ModalHeader>
            <ModalBody>
                <div className="flex flex-col gap-4">
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
                    <Textarea
                        label="Explanation"
                        placeholder="Enter explanation"
                        value={explanation}
                        onValueChange={setExplanation}
                        isRequired
                    />
                    <Textarea
                        label="Correct Usage"
                        placeholder="Enter correct usage"
                        value={correctUsage}
                        onValueChange={setCorrectUsage}
                        isRequired
                    />
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
