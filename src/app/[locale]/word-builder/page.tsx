import type { Metadata } from "next";
import type { Params } from "next/dist/server/request/params";
import { getTranslations } from "next-intl/server";
import VerbBuilder from "@/src/components/tools/verb-builder";

export async function generateMetadata({
    params,
}: {
    params: Promise<Params>;
}): Promise<Metadata> {
    const { locale } = (await params) as { locale: string };
    const t = await getTranslations({ locale, namespace: "VerbBuilder" });

    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}

export default async function WordBuilderPage() {
    return (
        <section className="w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <VerbBuilder />
        </section>
    );
}
