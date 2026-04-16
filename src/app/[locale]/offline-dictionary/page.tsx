import { getTranslations, setRequestLocale } from "next-intl/server";
import OfflineDictionaryClient from "./offline-dictionary-client";
import CustomCard from "@/src/components/customs/heroui/custom-card";

export default async function OfflineDictionaryPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("OfflineDictionary");

    return (
        <div className="container flex flex-col justify-center max-w-3xl">
            <CustomCard >
                <div className="px-4 pt-4 pb-2 text-lg font-semibold">
                    {t("title")}
                </div>
                <OfflineDictionaryClient />
            </CustomCard>
        </div>
    );
}
