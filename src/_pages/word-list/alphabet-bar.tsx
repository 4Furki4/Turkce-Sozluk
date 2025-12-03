"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@heroui/react";

interface AlphabetBarProps {
    selectedLetter: string | null;
    onLetterSelect: (letter: string | null) => void;
}

const TURKISH_ALPHABET = [
    "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L", "M",
    "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z"
];

export function AlphabetBar({ selectedLetter, onLetterSelect }: AlphabetBarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="sticky top-0 z-10 p-4">
            <div className="sm:hidden w-full mb-2">
                <Button
                    fullWidth
                    variant="flat"
                    size="sm"
                    onPress={() => setIsOpen(!isOpen)}
                    className="bg-background/40 backdrop-blur-md"
                >
                    {isOpen ? "Hide A-Z Index" : `Show A-Z Index ${selectedLetter ? `(${selectedLetter})` : ''}`}
                </Button>
            </div>
            <div className={cn(
                "flex-wrap justify-center gap-1",
                isOpen ? "flex" : "hidden sm:flex"
            )}>
                <Button
                    size="sm"
                    variant={selectedLetter === null ? "solid" : "light"}
                    color={selectedLetter === null ? "primary" : "default"}
                    onPress={() => onLetterSelect(null)}
                    className="min-w-8 h-8 font-bold"
                >
                    ALL
                </Button>
                {TURKISH_ALPHABET.map((letter) => (
                    <Button
                        key={letter}
                        size="sm"
                        variant={selectedLetter === letter ? "solid" : "light"}
                        color={selectedLetter === letter ? "primary" : "default"}
                        onPress={() => onLetterSelect(letter)}
                        className="min-w-8 h-8 font-bold"
                    >
                        {letter}
                    </Button>
                ))}
            </div>
        </div>
    );
}
