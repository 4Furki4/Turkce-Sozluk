import MisspellingsList from "@/src/_pages/dashboard/misspellings/misspellings-list";
import { getTranslations } from "next-intl/server";
import { outcomeQuerySchema } from "@/src/lib/search-outcome-schema";
import { z } from "zod";
import { getPathname, redirect } from "@/src/i18n/routing";

interface PageProps {
    params: Promise<{
        locale: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard" });
    return {
        title: t("Misspellings.pageTitle"),
    };
}

export default async function MisspellingsPage({ searchParams, params: routeParams }: { params: Promise<{ locale: "en" | "tr" }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const term = outcomeQuerySchema.safeParse(params.term);
    const id = z.coerce.number().int().positive().max(2147483647).safeParse(params.correctionId);
    const initialTerm = term.success && !term.data.includes("_") ? term.data : undefined;
    const correctionId = id.success ? id.data : undefined;
    if (initialTerm) {
        const { locale } = await routeParams;
        redirect({ locale, href: { pathname: "/dashboard/misspellings/new", query: { term: initialTerm, returnTo: getPathname({ locale, href: "/dashboard/misspellings" }) } } });
    }
    return <MisspellingsList key={correctionId} correctionId={correctionId} />;
}
