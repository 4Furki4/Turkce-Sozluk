"use client";

import { useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Link } from "@/src/i18n/routing";

export default function PageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    const t = useTranslations("SharedUI");
    const errors = useTranslations("Errors");
    const [isPending, startTransition] = useTransition();
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    return (
        <section className="relative mx-auto my-8 w-[calc(100%-2rem)] max-w-xl min-w-0 self-center rounded-md border border-border bg-background/40 p-6 sm:p-8" role="alert" aria-labelledby="page-error-title">
            <TriangleAlert className="mb-4 h-8 w-8 text-primary" aria-hidden="true" />
            <h1 ref={titleRef} tabIndex={-1} id="page-error-title" className="text-2xl font-semibold [overflow-wrap:anywhere]">{t("PageLoadTitle")}</h1>
            <p className="mt-3 text-base text-foreground/80">{t("PageLoadDescription")}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" disabled={isPending} aria-busy={isPending} onClick={() => startTransition(retry)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">
                    <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {errors("Retry")}
                </button>
                <Link href="/" className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t("Home")}</Link>
            </div>
        </section>
    );
}
