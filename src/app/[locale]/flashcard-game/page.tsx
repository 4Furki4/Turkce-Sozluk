import { redirect } from "@/src/i18n/routing";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Flashcards | Turkish Dictionary" : "Kelime Kartları | Türkçe Sözlük",
        description: locale === "en"
            ? "Practice Turkish vocabulary with focused flashcards."
            : "Odaklı kelime kartlarıyla Türkçe kelime pratiği yapın.",
    };
}

export default async function FlashcardGamePage(
    props: {
        params: Promise<{ locale: string }>;
    },
) {
    const { locale } = await props.params;

    redirect({
        href: "/play/flashcards",
        locale,
    });
}
