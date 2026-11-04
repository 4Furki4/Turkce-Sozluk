"use client";

import React from "react";
import { Card, CardHeader, CardBody, CardFooter, Chip } from "@heroui/react";
import { Link } from "@/src/i18n/routing";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { getHeadwordProps } from "@/src/lib/headword-presentation";

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
    const t = useTranslations("WordList.entry");
    return (
        <Link prefetch={false} href={{
            pathname: '/search/[word]',
            params: { word: name }
        }} className="block h-full rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">
            <Card
                className="group h-full w-full rounded-xl border border-border bg-background/40 shadow-none transition-colors hover:border-primary/40 motion-reduce:transition-none"
            >
                <CardHeader className="dictionary-headword-container flex flex-col items-start gap-1 px-5 pt-5 pb-2">
                    <div className="flex w-full justify-between items-start">
                        <h3 {...getHeadwordProps(name)} lang="tr" className="dictionary-headword [--headword-max:1.5rem] text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                            {name}
                        </h3>
                        {partOfSpeech && (
                            <Chip radius="md"
                                size="sm"
                                variant="flat"
                                color="secondary"
                                classNames={{
                                    base: "bg-secondary/20 text-secondary-foreground font-medium font-mono",
                                }}
                            >
                                {partOfSpeech}
                            </Chip>
                        )}
                    </div>
                    {origin && (
                        <span className="text-xs text-muted-foreground italic font-mono">
                            {origin}
                        </span>
                    )}
                </CardHeader>

                <CardBody className="px-5 py-2">
                    <div className="flex flex-col gap-2">
                        {meanings.length > 0 ? (
                            meanings.slice(0, 2).map((m, idx) => (
                                <p lang="tr" key={m.id} className="dictionary-prose text-base text-foreground/80 line-clamp-3 leading-relaxed">
                                    <span className="font-semibold text-primary/70 mr-2">{idx + 1}.</span>
                                    {m.meaning}
                                </p>
                            ))
                        ) : relatedWord ? (
                            <p className="text-sm text-muted-foreground italic">
                                {t(relationType === 'turkish_equivalent' ? 'turkishEquivalent' : 'seeAlso')} <span className="font-semibold text-primary">{relatedWord}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">
                                {t('noMeaning')}
                            </p>
                        )}
                    </div>
                </CardBody>

                <CardFooter className="px-5 pb-5 pt-3 flex justify-end">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary ">
                        {t('viewDetails')}
                        <ArrowRight size={16} />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}
