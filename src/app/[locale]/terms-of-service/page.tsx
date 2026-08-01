import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { io } from "next/cache";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";
import type { Metadata } from "next";

export const instant = false;

interface TermsOfServicePageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({
    params,
}: TermsOfServicePageProps): Promise<Metadata> {
    const { locale } = await params;
    const resolvedLocale = locale === "en" ? "en" : "tr";

    return {
        alternates: {
            canonical: getStaticRouteCanonicalPath("/terms-of-service", resolvedLocale),
        },
    };
}

export default function TermsOfServicePage({ params }: TermsOfServicePageProps) {
    const { locale } = use(params);
    use(io());
    setRequestLocale(locale);
    const t = useTranslations("TermsOfService");

    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
            <p className="text-muted-foreground mb-8">
                {t("lastUpdated", { date: new Date().toLocaleDateString(locale) })}
            </p>

            <div className="prose dark:prose-invert max-w-none">
                <p>{t("introduction")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("userAccounts.title")}</h2>
                <p>{t("userAccounts.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("userContent.title")}</h2>
                <p>{t("userContent.p1")}</p>
                <p>{t("userContent.p2")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("licenseAndRestrictions.title")}</h2>
                <p>{t("licenseAndRestrictions.p1")}</p>
                <p>{t("licenseAndRestrictions.p2")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("disclaimers.title")}</h2>
                <p>{t("disclaimers.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("limitationOfLiability.title")}</h2>
                <p>{t("limitationOfLiability.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("governingLaw.title")}</h2>
                <p>{t("governingLaw.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("contact.title")}</h2>
                <p>{t("contact.p1")}</p>
            </div>
        </div>
    );
}
