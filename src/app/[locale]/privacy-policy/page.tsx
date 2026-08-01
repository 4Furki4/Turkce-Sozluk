import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { io } from "next/cache";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";
import type { Metadata } from "next";

export const instant = false;

interface PrivacyPolicyPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({
    params,
}: PrivacyPolicyPageProps): Promise<Metadata> {
    const { locale } = await params;
    const resolvedLocale = locale === "en" ? "en" : "tr";

    return {
        alternates: {
            canonical: getStaticRouteCanonicalPath("/privacy-policy", resolvedLocale),
        },
    };
}

export default function PrivacyPolicyPage({ params }: PrivacyPolicyPageProps) {
    const { locale } = use(params);
    use(io());
    setRequestLocale(locale);
    const t = useTranslations("PrivacyPolicy");

    return (
        <div className="container mx-auto  py-12 px-4">
            <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
            <p className="text-muted-foreground mb-8">
                {t("lastUpdated", { date: new Date().toLocaleDateString(locale) })}
            </p>

            <div className="prose dark:prose-invert max-w-none">
                <p>{t("introduction")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("dataController.title")}</h2>
                <p>{t("dataController.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("dataCollected.title")}</h2>
                <ul>
                    <li>{t("dataCollected.item1")}</li>
                    <li>{t("dataCollected.item2")}</li>
                    <li>{t("dataCollected.item3")}</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("purposeOfProcessing.title")}</h2>
                <ul>
                    <li>{t("purposeOfProcessing.item1")}</li>
                    <li>{t("purposeOfProcessing.item2")}</li>
                    <li>{t("purposeOfProcessing.item3")}</li>
                    <li>{t("purposeOfProcessing.item4")}</li>
                </ul>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("dataSharing.title")}</h2>
                <p>{t("dataSharing.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("userRights.title")}</h2>
                <p>{t("userRights.intro")}</p>
                <ul>
                    <li>{t("userRights.item1")}</li>
                    <li>{t("userRights.item2")}</li>
                    <li>{t("userRights.item3")}</li>
                    <li>{t("userRights.item4")}</li>
                    <li>{t("userRights.item5")}</li>
                </ul>
                <p>{t("userRights.outro")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("dataSecurity.title")}</h2>
                <p>{t("dataSecurity.p1")}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t("contact.title")}</h2>
                <p>{t("contact.p1")}</p>

            </div>
        </div>
    );
}
