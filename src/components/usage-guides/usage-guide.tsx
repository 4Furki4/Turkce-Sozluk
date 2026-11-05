import { Link } from "@/src/i18n/routing";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

const guides = [
    {
        href: "/sik-yapilan-yanlislar",
        title: "misspellingsTitle",
        description: "misspellingsDescription",
    },
    {
        href: "/galati-meshur",
        title: "galatiMeshurTitle",
        description: "galatiMeshurDescription",
    },
] as const;

type GuidePath = (typeof guides)[number]["href"];

export async function UsageGuide({
    current,
    children,
}: {
    current: GuidePath;
    children: ReactNode;
}) {
    const t = await getTranslations("Home.HomeExtras");
    const guide = current === "/galati-meshur" ? guides[1] : guides[0];

    return (
        <div className="mx-auto w-full max-w-4xl px-4 pt-5 pb-12 sm:px-8 sm:pt-9 sm:pb-16 forced-colors:[&_a:focus-visible]:outline-2">
            <header>
                <Link
                    href="/"
                    className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-foreground/75 hover:text-primary"
                >
                    <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                    {t("backToHome")}
                </Link>

                <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                    {t(guide.title)}
                </h1>
                <p className="mt-3 max-w-prose text-base leading-relaxed text-foreground/75 sm:text-lg">
                    {t(guide.description)}
                </p>

                <nav
                    aria-label={t("usageGuidesLabel")}
                    className="mt-6 flex flex-wrap gap-x-5 border-b border-foreground/15 sm:mt-8 sm:gap-x-8"
                >
                    {guides.map(({ href, title }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={href === current ? "page" : undefined}
                            className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent py-2 text-sm font-semibold text-foreground/75 hover:text-primary aria-[current=page]:border-current aria-[current=page]:text-primary sm:text-base"
                        >
                            {t(title)}
                        </Link>
                    ))}
                </nav>
            </header>

            {children}
        </div>
    );
}
