import MisspellingsList from "@/src/_pages/dashboard/misspellings/misspellings-list";
import { getTranslations } from "next-intl/server";

interface PageProps {
    params: Promise<{
        locale: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard" });
    return {
        title: "Misspellings Management",
    };
}

export default function MisspellingsPage() {
    return <MisspellingsList />;
}
