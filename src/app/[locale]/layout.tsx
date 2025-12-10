import { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { TRPCReactProvider } from "@/src/trpc/react";
import { GeistSans } from "geist/font/sans";
import Providers from "@/src/components/customs/provider";
import IOSPWAMeta from "@/src/components/ios-pwa-meta";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/src/components/customs/sonner";
import Footer from "@/src/components/customs/footer";
import { routing } from "@/src/i18n/routing";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import { Params } from "next/dist/server/request/params";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import NavbarAndSidebar from "@/src/components/customs/navbar-and-sidebar";
import { BackgroundGradient } from "@/src/components/customs/background-gradient";
import { CaptchaProvider } from "@/src/components/customs/captcha-provider";
import { PreferencesInitializer } from "@/src/components/customs/preferences-initializer";
// import { SessionProvider } from "next-auth/react"; // Removed
import { AutocompleteSync } from "@/src/components/customs/complete-sync";
import ProfileGuard from "@/src/components/customs/profile-guard";
import { authClient } from "@/src/lib/auth-client";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "tr" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;

}): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';

  // --- Unified, SEO-friendly Description ---
  // Using a single, strong description ensures a consistent message.
  // This version highlights the key features: community-driven, modern, and open-source.
  const description = isEnglish
    ? "The community-driven, modern, and open-source Turkish Dictionary. Search for words and their meanings, see sample sentences, and contribute."
    : "Toplulukla gelişen, çağdaş ve açık kaynak Türkçe Sözlük. Kelimeleri ve anlamlarını arayın, paylaşın, örnek cümleleri görün ve katkıda bulunun.";

  // --- Homepage-specific Keywords ---
  // While not used by Google for ranking, this can be useful for other tools.
  const keywords = isEnglish
    ? ['turkish', 'dictionary', 'turkish language', 'online dictionary', 'learn turkish', 'sozluk', 'modern', 'open source', 'community driven']
    : ['türkçe', 'sözlük', 'türkçe sözlük', 'online sözlük', 'türkçe öğren', 'kelime anlamları', 'tdk', 'çağdaş türkçe sözlük', 'modern', 'açık kaynak', 'toplulukla gelişen'];
  // --- Dynamic URL Logic ---
  let siteUrl;
  if (process.env.VERCEL_ENV === 'production') {
    siteUrl = 'https://turkce-sozluk.com'; // canonical production URL
  } else if (process.env.VERCEL_URL) {
    siteUrl = `https://${process.env.VERCEL_URL}`; // Preview URLs
  } else {
    siteUrl = 'http://localhost:3000'; // Local development
  }
  return {
    applicationName: isEnglish ? "Turkish Dictionary" : "Türkçe Sözlük",


    icons: {
      apple: [
        {
          url: '/icons/apple-icon-180.png',
          sizes: '180x180',
          type: 'image/png',
        }
      ],
      other: [
        {
          rel: 'apple-touch-icon-precomposed',
          url: '/icons/apple-icon-180.png',
        },
      ],
      icon: [
        {
          url: '/icons/manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          url: '/icons/manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
        }
      ],
      shortcut: '/logo.svg',
    },
    formatDetection: {
      telephone: false,
    },
    metadataBase: new URL(siteUrl),
    manifest: '/manifest.json',
    // --- Title ---
    // The title structure is excellent. No changes needed.
    title: {
      template: isEnglish ? "%s | Modern Turkish Dictionary" : "%s | Modern Türkçe Sözlük",
      default: isEnglish
        ? "Turkish Dictionary - The Modern, Open-Source and Community-Driven Dictionary"
        : "Türkçe Sözlük - Toplulukla Gelişen, Çağdaş ve Açık Kaynak Sözlük",
    },
    // --- Main Description ---
    description,
    // --- Keywords ---
    keywords,
    // --- Open Graph (for social media) ---
    openGraph: {
      title: isEnglish ? "Modern Turkish Dictionary" : "Çağdaş Türkçe Sözlük",
      description, // Using the unified description
      type: 'website',
      locale: isEnglish ? 'en_US' : 'tr_TR',
      siteName: isEnglish ? 'Turkish Dictionary' : 'Türkçe Sözlük',
      // The opengraph-image is automatically added by Next.js
    },
    // --- Twitter Card ---
    twitter: {
      card: 'summary_large_image',
      title: isEnglish ? "Modern Turkish Dictionary" : "Çağdaş Türkçe Sözlük",
      description, // Using the unified description
      // The twitter:image is also automatically added
    },
    // --- Alternates ---
    // Your alternates configuration is perfect for i18n. No changes needed.
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en-US': '/en',
        'tr-TR': '/tr',
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#a91011",
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const messages = await getMessages();
  setRequestLocale(locale);
  const t = await getTranslations("Navbar");

  return (
    <html suppressHydrationWarning lang={locale} className="dark">
      <head>
        <IOSPWAMeta />
      </head>

      <body className={`${GeistSans.className} relative`}>
        <TRPCReactProvider>
          <NextIntlClientProvider messages={messages}>
            <CaptchaProvider>
              <Providers>
                <AutocompleteSync />
                <ProfileGuard />
                <div className="flex flex-col min-h-screen">
                  <PreferencesInitializer />
                  <NavbarAndSidebar
                    session={session}
                    HomeIntl={t("Home")}
                    SignInIntl={t("Sign In")}
                    WordListIntl={t("Word List")}
                    TitleIntl={t("Title")}
                    ProfileIntl={t("Profile")}
                    SavedWordsIntl={t("SavedWords")}
                    MyRequestsIntl={t("MyRequests")}
                    SearchHistoryIntl={t("SearchHistory")}
                    LogoutIntl={t("Logout")}
                    AnnouncementsIntl={t("Announcements")}
                    ContributeWordIntl={t("ContributeWord")}
                    PronunciationsIntl={t("Pronunciations")}
                    ariaAvatar={t("ariaAvatar")}
                    ariaMenu={t("ariaMenu")}
                    ariaLanguages={t("ariaLanguages")}
                    ariaSwitchTheme={t("ariaSwitchTheme")}
                    ariaBlur={t("ariaBlur")}
                    ContributeIntl={t("Contribute")}
                    FeedbackIntl={t("Feedback")}
                  />
                  <main className="relative w-full flex-grow flex min-h-[calc(100vh-var(--navbar-height))]">
                    {/* ✨ Moved BackgroundGradient here */}
                    <BackgroundGradient />
                    {children}
                  </main>
                  <Footer session={session} />
                </div>
                <SpeedInsights />
                <Analytics />
              </Providers>
            </CaptchaProvider >
            <Toaster />
          </NextIntlClientProvider >
        </TRPCReactProvider >
      </body >
    </html >
  );
}
