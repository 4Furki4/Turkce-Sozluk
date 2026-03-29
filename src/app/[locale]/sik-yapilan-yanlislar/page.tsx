import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import { CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function CommonMisspellingsPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("Home.HomeExtras");
    const firstPage = await api.extras.getMisspellings({ limit: 1, offset: 0 });
    const misspellingsResponse =
        firstPage.total > 0
            ? await api.extras.getMisspellings({ limit: firstPage.total, offset: 0 })
            : firstPage;

    return (
        <main className="container w-full mx-auto px-4 py-10">
            <div className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t("backToHome")}
                </Link>
                <h1 className="text-3xl sm:text-4xl font-bold mt-3">
                    {t("misspellingsTitle")}
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {misspellingsResponse.data.map((item) => (
                    <CustomCard key={item.id} className="p-0">
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2 text-danger">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span className="line-through decoration-danger/60">
                                    {item.wrong}
                                </span>
                            </div>

                            <div className="text-default-300 hidden sm:block">→</div>

                            <Link
                                href={{ pathname: "/search/[word]", params: { word: item.correct } }}
                                className="flex items-center gap-2 text-success hover:underline"
                            >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{item.correct}</span>
                            </Link>
                        </div>
                    </CustomCard>
                ))}

                {misspellingsResponse.data.length === 0 && (
                    <CustomCard>
                        <div className="p-6 text-sm text-muted-foreground">
                            {t("noMisspellingsFound")}
                        </div>
                    </CustomCard>
                )}
            </div>
        </main>
    );
}
