import { MisspellingsList } from "@/src/components/usage-guides/misspellings-list";
import { UsageGuide } from "@/src/components/usage-guides/usage-guide";
import { api } from "@/src/trpc/server";
import { setRequestLocale } from "next-intl/server";

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function CommonMisspellingsPage({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);

    const firstPage = await api.extras.getMisspellings({ limit: 1, offset: 0 });
    const { data } = firstPage.total > 1
        ? await api.extras.getMisspellings({ limit: firstPage.total, offset: 0 })
        : firstPage;

    return (
        <UsageGuide current="/sik-yapilan-yanlislar">
            <MisspellingsList entries={data} />
        </UsageGuide>
    );
}
