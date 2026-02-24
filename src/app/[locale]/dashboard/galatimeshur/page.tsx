import GalatiMeshurList from "@/src/_pages/dashboard/galatimeshur/galatimeshur-list";
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
        title: t("GalatiMeshur.pageTitle"),
    };
}

export default function GalatiMeshurPage() {
    return <GalatiMeshurList />;
}
