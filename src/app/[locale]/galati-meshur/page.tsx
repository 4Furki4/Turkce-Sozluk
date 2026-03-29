import CustomCard from "@/src/components/customs/heroui/custom-card";
import { Link } from "@/src/i18n/routing";
import { api } from "@/src/trpc/server";
import { BookOpen, CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function GalatiMeshurListPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("Home.HomeExtras");
    const firstPage = await api.extras.getGalatiMeshur({ limit: 1, offset: 0 });
    const galatiMeshurResponse =
        firstPage.total > 0
            ? await api.extras.getGalatiMeshur({ limit: firstPage.total, offset: 0 })
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
                <h1 className="text-3xl sm:text-4xl font-bold mt-3 flex items-center gap-3">
                    <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-500" />
                    {t("galatiMeshurTitle")}
                </h1>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {galatiMeshurResponse.data.map((item) => (
                    <CustomCard key={item.id} className="p-0">
                        <div className="px-5 pt-5 pb-2">
                            <h2 className="text-xl font-semibold">{item.word}</h2>
                        </div>

                        <div className="px-5 py-2 space-y-3">
                            <div className="flex items-start gap-2 text-default-500">
                                <XCircle className="w-4 h-4 mt-1 text-danger shrink-0" />
                                <p className="line-through decoration-danger/60">
                                    {item.explanation}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 mt-1 text-success shrink-0" />
                                <p className="font-medium text-foreground">
                                    {item.correctUsage || item.word}
                                </p>
                            </div>
                        </div>

                        <div className="px-5 pb-5 pt-1">
                            <Link
                                href={{
                                    pathname: "/galati-meshur/[id]",
                                    params: { id: item.id.toString() },
                                }}
                                className="inline-flex items-center rounded-medium bg-warning-500/15 hover:bg-warning-500/25 text-warning-700 dark:text-warning-400 px-3 py-1.5 text-sm font-medium transition-colors"
                            >
                                {t("seeDetails")}
                            </Link>
                        </div>
                    </CustomCard>
                ))}

                {galatiMeshurResponse.data.length === 0 && (
                    <CustomCard>
                        <div className="p-6 text-sm text-muted-foreground">
                            {t("noGalatiMeshurFound")}
                        </div>
                    </CustomCard>
                )}
            </div>
        </main>
    );
}
