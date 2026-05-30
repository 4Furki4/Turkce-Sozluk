import { Link } from "@/src/i18n/routing";
import type { WordSearchResult } from "@/types";

type WordEntryData = WordSearchResult["word_data"];

type WordPageFallbackProps = {
    locale: "en" | "tr";
    wordName: string;
    wordData?: WordEntryData;
};

export default function WordPageFallback({
    locale,
    wordName,
    wordData,
}: WordPageFallbackProps) {
    const isEnglish = locale === "en";

    return (
        <noscript>
            <style>{`.js-enhanced-word-result{display:none!important}`}</style>
            <article className="rounded-md border border-border bg-background/40 p-5 sm:p-7">
                {wordData ? (
                    <div className="grid gap-6">
                        <header className="border-b border-border/70 pb-5">
                            <p className="text-xs font-mono uppercase tracking-widest text-primary">
                                {isEnglish ? "Dictionary entry" : "Sözlük maddesi"}
                            </p>
                            <h1 className="mt-2 text-4xl font-bold text-foreground">
                                {wordData.word_name}
                            </h1>
                            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                                {wordData.phonetic ? <span className="font-mono">/{wordData.phonetic}/</span> : null}
                                {wordData.root?.root ? (
                                    <span className="font-mono">
                                        {wordData.root.root}
                                        {wordData.root.language_tr ? ` (${wordData.root.language_tr})` : ""}
                                    </span>
                                ) : null}
                                {wordData.attributes?.map((attribute) => (
                                    <span key={attribute.attribute_id} className="rounded-md bg-primary/10 px-2 py-1 text-primary">
                                        {attribute.attribute}
                                    </span>
                                ))}
                            </div>
                        </header>

                        <section>
                            <h2 className="text-xl font-semibold">{isEnglish ? "Meanings" : "Anlamlar"}</h2>
                            <ol className="mt-3 grid gap-4">
                                {wordData.meanings.map((meaning, index) => (
                                    <li key={meaning.meaning_id} className="rounded-md border border-border/70 bg-background/40 p-4">
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>{index + 1}</span>
                                            {meaning.part_of_speech ? <span>{meaning.part_of_speech}</span> : null}
                                            {meaning.attributes?.map((attribute) => (
                                                <span key={attribute.attribute_id} className="rounded-md bg-background/60 px-2 py-0.5">
                                                    {attribute.attribute}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-base leading-7 text-foreground">{meaning.meaning}</p>
                                        {meaning.sentence ? (
                                            <figure className="mt-3 border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground">
                                                <blockquote>{meaning.sentence}</blockquote>
                                                {meaning.author ? <figcaption className="mt-1">{meaning.author}</figcaption> : null}
                                            </figure>
                                        ) : null}
                                    </li>
                                ))}
                            </ol>
                        </section>

                        {wordData.relatedWords?.length || wordData.relatedPhrases?.length ? (
                            <section className="border-t border-border/70 pt-5">
                                <h2 className="text-xl font-semibold">{isEnglish ? "Related entries" : "İlgili maddeler"}</h2>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {wordData.relatedWords?.map((relatedWord) => (
                                        <Link
                                            key={relatedWord.related_word_id}
                                            href={{ pathname: "/search/[word]", params: { word: relatedWord.related_word_name } }}
                                            className="rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm text-primary hover:underline"
                                        >
                                            {relatedWord.related_word_name}
                                        </Link>
                                    ))}
                                    {wordData.relatedPhrases?.map((relatedPhrase) => (
                                        <Link
                                            key={relatedPhrase.related_phrase_id}
                                            href={{ pathname: "/search/[word]", params: { word: relatedPhrase.related_phrase } }}
                                            className="rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm text-primary hover:underline"
                                        >
                                            {relatedPhrase.related_phrase}
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold text-foreground">
                            {isEnglish ? "Word not found" : "Kelime bulunamadı"}
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            {isEnglish
                                ? `No server-rendered dictionary entry was found for "${wordName}". Offline and pattern search require JavaScript.`
                                : `"${wordName}" için sunucuda oluşturulmuş sözlük kaydı bulunamadı. Çevrim dışı arama ve desen arama JavaScript gerektirir.`}
                        </p>
                        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link href="/" className="rounded-md border border-border bg-background/60 px-4 py-2 text-sm text-foreground hover:text-primary">
                                {isEnglish ? "Back to search" : "Aramaya dön"}
                            </Link>
                            <Link
                                href={{ pathname: "/contribute-word", query: { word: wordName } }}
                                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                            >
                                {isEnglish ? "Add detailed entry" : "Ayrıntılı madde ekle"}
                            </Link>
                        </div>
                    </div>
                )}
            </article>
        </noscript>
    );
}
