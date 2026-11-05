import { UsageGuide } from "@/src/components/usage-guides/usage-guide";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function GalatiMeshurListPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    const [t, firstPage] = await Promise.all([
        getTranslations("Home.HomeExtras"),
        api.extras.getGalatiMeshur({ limit: 1, offset: 0 }),
    ]);
    const { data } = firstPage.total > 1
        ? await api.extras.getGalatiMeshur({ limit: firstPage.total, offset: 0 })
        : firstPage;

    return (
        <UsageGuide current="/galati-meshur">
            <div className="mt-6 sm:mt-8">
                {data.length === 0 ? (
                    <p className="text-foreground/75">{t("noGalatiMeshurFound")}</p>
                ) : (
                    <>
                        <p className="mb-4 text-sm text-foreground/75 tabular-nums">
                            {t("usageCount", { count: data.length })}
                        </p>
                        <ul role="list" className="divide-y divide-foreground/15 rounded-xl border border-foreground/15 bg-background/40">
                            {data.map(({ id, word, explanation, correctUsage }) => (
                                <li key={id} className="px-4 py-5 sm:p-6 md:px-8 md:py-7">
                                    <article className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
                                        <div>
                                            <h2 lang="tr" className="dictionary-prose text-2xl font-semibold tracking-tight sm:text-3xl">
                                                {word}
                                            </h2>
                                            {correctUsage?.trim() && (
                                                <dl className="mt-3">
                                                    <dt className="text-sm text-foreground/75">{t("correctUsage")}</dt>
                                                    <dd lang="tr" className="dictionary-prose mt-0.5 font-semibold">{correctUsage}</dd>
                                                </dl>
                                            )}
                                        </div>

                                        <div>
                                            <p lang="tr" className="dictionary-prose max-w-prose whitespace-pre-line leading-relaxed text-foreground/85">
                                                {explanation}
                                            </p>
                                            <Link
                                                href={{ pathname: "/galati-meshur/[id]", params: { id: String(id) } }}
                                                aria-label={t("usageDetailsFor", { word })}
                                                className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm text-sm font-semibold text-primary underline decoration-current/45 underline-offset-4 hover:decoration-current"
                                            >
                                                {t("usageDetails")}
                                                <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                                            </Link>
                                        </div>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </UsageGuide>
    );
}
