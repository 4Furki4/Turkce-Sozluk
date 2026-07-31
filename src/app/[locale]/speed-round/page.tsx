import { redirect } from "@/src/i18n/routing";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === "en" ? "Speed Round | Turkish Dictionary" : "Hızlı Tur | Türkçe Sözlük",
        description: locale === "en"
            ? "Test your Turkish vocabulary knowledge in this fast-paced quiz game"
            : "Bu hızlı tempolu kelime yarışmasında Türkçe kelime bilginizi test edin"
    };
}

export default async function SpeedRoundPage(
    props: {
        params: Promise<{ locale: string }>;
    }
) {
    const params = await props.params;
    const { locale } = params;

    redirect({
        href: "/play/speed-round",
        locale,
    });
}
