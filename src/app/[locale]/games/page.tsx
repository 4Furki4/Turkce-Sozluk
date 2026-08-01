import GamesPage from "@/src/_pages/games/games-page";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStaticRouteCanonicalPath } from "@/src/lib/seo-utils";

export const instant = false;

interface GamesRouteProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: GamesRouteProps): Promise<Metadata> {
    const { locale } = await params;
    const resolvedLocale = locale === "en" ? "en" : "tr";
    const t = await getTranslations({ locale: resolvedLocale, namespace: "GamesHub" });

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
        alternates: {
            canonical: getStaticRouteCanonicalPath("/games", resolvedLocale),
        },
    };
}

export default async function GamesRoute({ params }: GamesRouteProps) {
    const { locale } = await params;
    setRequestLocale(locale === "en" ? "en" : "tr");

    return <GamesPage />;
}
