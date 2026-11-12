import { Link } from "@/src/i18n/routing";
import type { WordEditorial } from "@/src/lib/word-editorial";
import { getTranslations } from "next-intl/server";

export default async function WordUsageNote({ word, editorial }: {
    word: string;
    editorial: WordEditorial;
}) {
    const t = await getTranslations({ locale: "tr", namespace: "WordCard" });
    const linkClassName = "text-primary underline underline-offset-4";

    return (
        <aside aria-labelledby="word-usage-note" className="mb-4 rounded-md border border-border bg-background/40 p-4 sm:p-5">
            <p id="word-usage-note" className="text-sm font-semibold text-foreground">
                {t("UsageNote")}
            </p>
            <p className="mt-2 max-w-prose leading-7 text-foreground">{editorial.answer}</p>
            <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">{editorial.example}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {editorial.relatedWords.map((relatedWord) => (
                    <li key={relatedWord}>
                        <Link
                            className={linkClassName}
                            href={{ pathname: "/search/[word]", params: { word: relatedWord } }}
                        >
                            {relatedWord}
                        </Link>
                    </li>
                ))}
                {editorial.guide && (
                    <li>
                        <Link className={linkClassName} href={editorial.guide}>
                            {t(editorial.guide === "/galati-meshur" ? "UsageGuideLink" : "SpellingGuideLink")}
                        </Link>
                    </li>
                )}
            </ul>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs leading-5">
                <a className={linkClassName} href={`https://sozluk.gov.tr/kelime/${encodeURIComponent(word)}`}>
                    {t("TdkEntrySource")}
                </a>
                {editorial.additionalSource && (
                    <a className={linkClassName} href={editorial.additionalSource.href}>
                        {editorial.additionalSource.label}
                    </a>
                )}
            </p>
        </aside>
    );
}
