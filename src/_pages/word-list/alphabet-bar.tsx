"use client";

import React, { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TURKISH_ALPHABET } from "@/src/lib/turkish-alphabet";

interface AlphabetBarProps {
    selectedLetter: string | null;
    onLetterSelect: (letter: string | null) => void;
}

export function AlphabetBar({ selectedLetter, onLetterSelect }: AlphabetBarProps) {
    const t = useTranslations('WordList.alphabet');
    const [isOpen, setIsOpen] = useState(false);
    const indexId = useId();

    return (
        <div className="border-y border-border/70 py-2">
            <Button
                fullWidth
                variant="light"
                className="min-h-11 justify-between px-2 text-sm sm:hidden"
                aria-expanded={isOpen}
                aria-controls={indexId}
                onPress={() => setIsOpen(value => !value)}
                endContent={isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            >
                {t(isOpen ? 'hide' : 'show')}{selectedLetter ? ` · ${selectedLetter}` : ''}
            </Button>
            <div id={indexId} role="group" aria-label={t('label')} className={cn('flex-wrap items-center gap-1', isOpen ? 'flex' : 'hidden sm:flex')}>
                <Button
                    variant={selectedLetter === null ? 'solid' : 'light'}
                    color={selectedLetter === null ? 'primary' : 'default'}
                    aria-pressed={selectedLetter === null}
                    onPress={() => onLetterSelect(null)}
                    className="h-11 min-w-11 px-3 text-sm font-medium"
                >
                    {t('all')}
                </Button>
                {TURKISH_ALPHABET.map(value => {
                    const letter = value.toLocaleUpperCase('tr-TR');
                    return (
                        <Button
                            key={letter}
                            isIconOnly
                            variant={selectedLetter === letter ? 'solid' : 'light'}
                            color={selectedLetter === letter ? 'primary' : 'default'}
                            aria-label={t('startsWith', { letter })}
                            aria-pressed={selectedLetter === letter}
                            onPress={() => onLetterSelect(letter)}
                            className="h-11 min-w-11 text-sm font-medium sm:min-w-8 sm:w-8 sm:px-0"
                        >
                            {letter}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
