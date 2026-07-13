import { Link } from "@/src/i18n/routing";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import styles from "./not-found.module.css";

export default async function NotFound() {
    const t = await getTranslations("NotFoundPage");

    return (
        <section className={`${styles.page} relative flex w-full items-center overflow-hidden bg-background/40`}>
            <div className={`${styles.layout} relative mx-auto grid items-center`}>
                <div className={`${styles.hero} max-w-2xl`}>
                    <p className={`${styles.eyebrow} font-mono text-xs font-medium text-primary`}>
                        {t("eyebrow")}
                    </p>

                    <div className={`${styles.errorRow} mt-4 flex items-end gap-4 sm:gap-6`}>
                        <span className={`${styles.errorCode} font-mono font-semibold text-primary`}>
                            404
                        </span>
                        <span className={`${styles.marker} mb-1.5 border-l border-primary/40 pl-3 font-mono text-xs font-medium text-foreground/70 sm:mb-3`}>
                            {t("marker")}
                        </span>
                    </div>

                    <h1 className={`${styles.centeredCopy} mt-8 max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl`}>
                        {t("title")}
                    </h1>

                    <p className={`${styles.centeredCopy} mt-5 max-w-xl text-base leading-7 text-foreground/70 sm:text-lg`}>
                        {t("description")}
                    </p>

                    <div className={`${styles.actions} mt-9 flex flex-col gap-3 sm:flex-row`}>
                        <Link
                            href="/"
                            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5"
                        >
                            <ArrowLeft className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:-translate-x-0.5" />
                            {t("home")}
                        </Link>

                        <Link
                            href="/words"
                            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background/40 px-5 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-primary/50"
                        >
                            <BookOpenText className="h-4 w-4 text-primary motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5" />
                            {t("words")}
                        </Link>
                    </div>
                </div>

                <aside
                    aria-label={t("entryLabel")}
                    className={`${styles.entryCard} relative overflow-hidden border border-border bg-background/40 p-6 sm:p-8`}
                >
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/35 motion-safe:animate-ping" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                            </span>
                            <p className={`${styles.metaLabel} font-mono text-[0.7rem] font-medium text-foreground/60`}>
                                {t("entryLabel")}
                            </p>
                        </div>
                        <span className="font-mono text-xs font-medium text-primary">404</span>
                    </div>

                    <dl className="mt-7">
                        <div>
                            <dt className={`${styles.metaLabel} font-mono text-[0.7rem] font-medium text-foreground/55`}>
                                {t("entryType")}
                            </dt>
                            <dd className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
                                {t("entryWord")}
                            </dd>
                        </div>

                        <div className="mt-7 border-l-2 border-primary pl-4">
                            <dt className={`${styles.metaLabel} font-mono text-[0.7rem] font-medium text-foreground/55`}>
                                {t("definitionLabel")}
                            </dt>
                            <dd className="mt-2 text-base leading-7 text-foreground/80">
                                {t("entryDefinition")}
                            </dd>
                        </div>
                    </dl>

                    <p className="mt-8 border-t border-border pt-4 text-sm leading-6 text-foreground/60">
                        {t("searchHint")}
                    </p>
                </aside>
            </div>
        </section>
    );
}
