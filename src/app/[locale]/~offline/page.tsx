import CustomCard from "@/src/components/customs/heroui/custom-card";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const generateMetadata = async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Offline");
    return {
        title: t("title"),
        description: t("description"),
        robots: {
            index: false,
            follow: false,
            googleBot: {
                index: false,
                follow: false
            }
        }
    };
};

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Offline");
    return (
        <div className="flex items-center justify-center mx-auto">
            <CustomCard className="p-6">
                <div className="pb-3 text-lg font-semibold">
                    <h1>{t("title")}</h1>
                </div>
                <div>
                    <p>{t("description")}</p>
                </div>
            </CustomCard>
        </div >
    );
}
