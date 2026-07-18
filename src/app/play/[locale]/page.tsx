import GamesPage from "@/src/_pages/games/games-page";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Play" });

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
        robots: { index: false, follow: false },
    };
}

export default async function PlayHomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    return <GamesPage />;
}
