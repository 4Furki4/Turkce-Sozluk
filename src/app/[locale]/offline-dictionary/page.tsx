import { getTranslations, setRequestLocale } from "next-intl/server";
import OfflineDictionaryClient from "./offline-dictionary-client";
import CustomCard from "@/src/components/customs/heroui/custom-card";
import { NoScriptNotice } from "@/src/components/progressive-enhancement/no-script-notice";

export default async function OfflineDictionaryPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("OfflineDictionary");

    return (
        <div className="container flex flex-col justify-center max-w-3xl">
            <NoScriptNotice>
                {locale === "en"
                    ? "JavaScript is required to download, update, and manage the offline dictionary on this device."
                    : "Çevrim dışı sözlüğü bu cihaza indirmek, güncellemek ve yönetmek için JavaScript gerekir."}
            </NoScriptNotice>
            <CustomCard >
                <div className="px-4 pt-4 pb-2 text-lg font-semibold">
                    {t("title")}
                </div>
                <OfflineDictionaryClient />
            </CustomCard>
        </div>
    );
}
