import "@/app/globals.css";
import { PlayShell } from "@/src/components/play/play-shell";
import { auth } from "@/src/lib/auth";
import { TRPCReactProvider } from "@/src/trpc/react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { headers } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/src/i18n/routing";

const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700"],
    variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700"],
    variable: "--font-ibm-plex-mono",
});

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function PlayRootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}>) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    const [messages, session] = await Promise.all([
        getMessages(),
        auth.api.getSession({ headers: await headers() }).catch(() => null),
    ]);

    setRequestLocale(locale);

    return (
        <html lang={locale}>
            <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
                <TRPCReactProvider>
                    <NextIntlClientProvider messages={messages}>
                        <PlayShell locale={locale} session={session}>
                            {children}
                        </PlayShell>
                    </NextIntlClientProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
