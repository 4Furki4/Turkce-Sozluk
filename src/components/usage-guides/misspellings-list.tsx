"use client";

import { CustomInput } from "@/src/components/customs/heroui/custom-input";
import { Link } from "@/src/i18n/routing";
import { normalizeDictionaryQuery } from "@/src/lib/search-suggestions";
import { ArrowRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

type Misspelling = {
    id: number;
    wrong: string;
    correct: string;
};

export function MisspellingsList({ entries }: { entries: Misspelling[] }) {
    const t = useTranslations("Home.HomeExtras");
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const normalizedQuery = normalizeDictionaryQuery(query.normalize("NFC"));
    const matches = normalizedQuery
        ? entries.filter(({ wrong, correct }) =>
            [wrong, correct].some((word) =>
                normalizeDictionaryQuery(word.normalize("NFC")).includes(normalizedQuery),
            ),
        )
        : entries;

    if (entries.length === 0) {
        return <p className="mt-6 text-foreground/75">{t("noMisspellingsFound")}</p>;
    }

    return (
        <div className="mt-6 space-y-4 sm:mt-8">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <CustomInput
                    ref={inputRef}
                    aria-label={t("filterSpellings")}
                    placeholder={t("filterSpellings")}
                    value={query}
                    onValueChange={setQuery}
                    size="md"
                    className="w-full sm:max-w-sm"
                    classNames={{
                        inputWrapper: "h-11 border border-foreground/60 bg-background/40 shadow-none backdrop-blur-none group-data-[hover=true]:border-foreground/75 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-ring",
                        input: "placeholder:text-foreground/70",
                    }}
                    startContent={<Search aria-hidden="true" className="size-4 shrink-0 text-foreground/65" />}
                    endContent={query && (
                        <button
                            type="button"
                            aria-label={t("clearSpellingFilter")}
                            className="-me-2 grid size-10 shrink-0 place-items-center rounded-md text-foreground/75 hover:text-primary"
                            onClick={() => {
                                setQuery("");
                                inputRef.current?.focus();
                            }}
                        >
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    )}
                />
                <p role="status" className="text-sm text-foreground/75 tabular-nums">
                    {t("spellingCount", { count: matches.length })}
                </p>
            </div>

            {matches.length > 0 ? (
                <div className="rounded-xl border border-foreground/15 bg-background/40">
                    <table className="w-full table-fixed border-collapse text-left">
                        <caption className="sr-only">{t("misspellingsTitle")}</caption>
                        <thead>
                            <tr className="border-b border-foreground/15 text-sm font-semibold">
                                <th scope="col" className="w-1/2 px-3 py-3 sm:w-2/5 sm:px-6">{t("wrongSpelling")}</th>
                                <th scope="col" className="px-3 py-3 sm:px-6">{t("correctSpelling")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/10">
                            {matches.map(({ id, wrong, correct }) => (
                                <tr key={id}>
                                    <td lang="tr" className="dictionary-prose px-3 py-2 text-foreground/75 sm:px-6">
                                        {wrong}
                                    </td>
                                    <td className="px-3 sm:px-6">
                                        <Link
                                            href={{ pathname: "/search/[word]", params: { word: correct } }}
                                            prefetch={false}
                                            className="group inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-sm py-1.5 font-semibold text-primary underline decoration-current/45 underline-offset-4 hover:decoration-current sm:gap-2"
                                        >
                                            <span lang="tr" className="dictionary-prose">{correct}</span>
                                            <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="rounded-xl border border-foreground/15 bg-background/40 p-4 text-foreground/75">
                    {t("noSpellingMatches")}
                </p>
            )}
        </div>
    );
}
