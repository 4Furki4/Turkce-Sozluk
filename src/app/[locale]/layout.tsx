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
import { auth } from "@/src/server/auth/auth";
import { Params } from "next/dist/server/request/params";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import NavbarAndSidebar from "@/src/components/customs/navbar-and-sidebar";
import { BackgroundGradient } from "@/src/components/customs/background-gradient";
import { CaptchaProvider } from "@/src/components/customs/captcha-provider";
import { PreferencesInitializer } from "@/src/components/customs/preferences-initializer";
import { SessionProvider } from "next-auth/react";
import { AutocompleteSync } from "@/src/components/customs/complete-sync";

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

    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: isEnglish ? "Modern Turkish Dictionary" : "Çağdaş Türkçe Sözlük",
      startupImage: [
        { url: '/icons/apple-splash-2048-2732.jpg', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2732-2048.jpg', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1668-2388.jpg', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2388-1668.jpg', media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1536-2048.jpg', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2048-1536.jpg', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1640-2360.jpg', media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2360-1640.jpg', media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1668-2224.jpg', media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2224-1668.jpg', media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1620-2160.jpg', media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2160-1620.jpg', media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1488-2266.jpg', media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2266-1488.jpg', media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1320-2868.jpg', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2868-1320.jpg', media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1206-2622.jpg', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2622-1206.jpg', media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1290-2796.jpg', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2796-1290.jpg', media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1179-2556.jpg', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2556-1179.jpg', media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1170-2532.jpg', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2532-1170.jpg', media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1284-2778.jpg', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2778-1284.jpg', media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1125-2436.jpg', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2436-1125.jpg', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1242-2688.jpg', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2688-1242.jpg', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-828-1792.jpg', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-1792-828.jpg', media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-1242-2208.jpg', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { url: '/icons/apple-splash-2208-1242.jpg', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)' },
        { url: '/icons/apple-splash-750-1334.jpg', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-1334-750.jpg', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
        { url: '/icons/apple-splash-640-1136.jpg', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { url: '/icons/apple-splash-1136-640.jpg', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)' },
      ],
    },
    icons: {
      apple: [
        {
          url: '/icons/apple-icon-180.png',
          sizes: '180x180',
          type: 'image/png',
        }
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
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>
}) {
  const { locale } = await params;
  const session = await auth();
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
                <AutocompleteSync /> {/* Add it right inside Providers */}
                <SessionProvider session={session}>

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
                </SessionProvider>
              </Providers>
            </CaptchaProvider >
            <Toaster />
          </NextIntlClientProvider >
        </TRPCReactProvider >
      </body >
    </html >
  );
}
