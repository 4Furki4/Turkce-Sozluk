"use client";

import React from "react";
import { Card, CardHeader, CardBody, CardFooter, Chip } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { ArrowRight } from "lucide-react";

interface WordCardProps {
    id: string;
    name: string;
    meanings: { id: string; meaning: string }[];
    partOfSpeech?: string;
    origin?: string;
    relatedWord?: string | null;
    relationType?: string | null;
}

export function WordCard({ id, name, meanings, partOfSpeech, origin, relatedWord, relationType }: WordCardProps) {
    return (
        <Link href={{
            pathname: '/search/[word]',
            params: { word: encodeURIComponent(name) }
        }} className="block h-full">
            <Card
                className="feature-card-shine group relative w-full h-full border border-white/10 bg-background/50  overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/30"
                isPressable
            >
                {/* Subtle primary accent on the left */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/0 group-hover:bg-primary transition-colors duration-300" />

                <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6 pb-2">
                    <div className="flex w-full justify-between items-start">
                        <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                            {name}
                        </h3>
                        {partOfSpeech && (
                            <Chip
                                size="sm"
                                variant="flat"
                                color="secondary"
                                classNames={{
                                    base: "bg-secondary/20 text-secondary-foreground font-medium",
                                }}
                            >
                                {partOfSpeech}
                            </Chip>
                        )}
                    </div>
                    {origin && (
                        <span className="text-xs text-muted-foreground italic">
                            {origin}
                        </span>
                    )}
                </CardHeader>

                <CardBody className="px-6 py-2">
                    <div className="flex flex-col gap-2">
                        {meanings.length > 0 ? (
                            meanings.slice(0, 2).map((m, idx) => (
                                <p key={m.id} className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                    <span className="font-semibold text-primary/70 mr-2">{idx + 1}.</span>
                                    {m.meaning}
                                </p>
                            ))
                        ) : relatedWord ? (
                            <p className="text-sm text-muted-foreground italic">
                                {relationType === 'turkish_equivalent' ? 'Türkçe karşılığı:' : 'Bakınız:'} <span className="font-semibold text-primary">{relatedWord}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                Anlam bulunamadı.
                            </p>
                        )}
                    </div>
                </CardBody>

                <CardFooter className="px-6 pb-6 pt-4 flex justify-end">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-100 translate-x-0 md:opacity-0 md:-translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 transition-all duration-300">
                        View Details
                        <ArrowRight size={16} />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}
