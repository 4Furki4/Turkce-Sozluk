import DailyWordsList from "@/src/_pages/dashboard/daily-words/daily-words-list";
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
        title: "Daily Words Management",
    };
}

export default function DailyWordsPage() {
    return <DailyWordsList />;
}
