import { redirect } from "@/src/i18n/routing";
import type { Metadata } from "next";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Word Matching Game | Turkish Dictionary" : "Kelime Eşleştirme Oyunu | Türkçe Sözlük",
        description: locale === "en"
            ? "Match Turkish words with their meanings in this fun vocabulary game"
            : "Eğlenceli kelime oyunuyla Türkçe kelimeleri anlamlarıyla eşleştirin",
    };
}

export default async function WordMatchingGamePage(
    props: {
        params: Promise<{ locale: string }>;
    }
) {
    const params = await props.params;
    const { locale } = params;

    redirect({
        href: "/play/word-matching",
        locale,
    });
}
