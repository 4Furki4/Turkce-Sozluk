import { getLocalizedRouteCanonicalPath } from "@/src/lib/seo-utils";
import type { Metadata } from "next";

type Props = {
    children: React.ReactNode;
    params: Promise<{ id: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id, locale } = await params;

    return {
        alternates: {
            canonical: getLocalizedRouteCanonicalPath(
                "/galati-meshur/[id]",
                locale === "en" ? "en" : "tr",
                { id: encodeURIComponent(id) },
            ),
        },
    };
}

export default function GalatiMeshurDetailLayout({ children }: Props) {
    return children;
}
