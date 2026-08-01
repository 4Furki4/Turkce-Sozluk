import { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { TRPCReactProvider } from "@/src/trpc/react";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Providers from "@/src/components/customs/provider";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/src/components/customs/sonner";
import Footer from "@/src/components/customs/footer";
import { routing } from "@/src/i18n/routing";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/src/lib/auth";
import { Params } from "next/dist/server/request/params";
import NavbarAndSidebar from "@/src/components/customs/navbar-and-sidebar";
import { BackgroundGradient } from "@/src/components/customs/background-gradient";
import { PreferencesInitializer } from "@/src/components/customs/preferences-initializer";
import NavigationProgressBar from "@/src/components/customs/navigation-progress-bar";
// import { SessionProvider } from "next-auth/react"; // Removed
import ProfileGuard from "@/src/components/customs/profile-guard";
import { getBaseUrl } from "@/src/lib/seo-utils";
import PWAServiceWorker from "@/src/components/pwa-service-worker";
import OnlineStatusBridge from "@/src/components/online-status-bridge";
import { AutocompleteSync } from "@/src/components/customs/complete-sync";
import WebMcpRegistrar from "@/src/components/webmcp/webmcp-registrar";
import { cache, Suspense } from "react";
import { FeedbackModal } from "@/src/components/customs/modals/add-feedback";
import { IOS_PWA_STARTUP_IMAGES } from "@/src/lib/ios-pwa-metadata";

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
        ...IOS_PWA_STARTUP_IMAGES,
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
    metadataBase: new URL(getBaseUrl()),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: isEnglish ? "Modern Turkish Dictionary" : "Çağdaş Türkçe Sözlük",
    },
    other: {
      "debug-ios-pwa": "true",
    },
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
    robots: isEnglish
      ? {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      }
      : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#a91011",
  viewportFit: "cover",
}

const getLayoutSession = cache(async () => {
  const requestHeaders = await headers();

  return auth.api.getSession({
    headers: requestHeaders,
  }).catch(() => {
    console.warn("[RootLayout] Session unavailable; rendering anonymous shell.");
    return null;
  });
});

type NavbarProps = Omit<
  React.ComponentProps<typeof NavbarAndSidebar>,
  "session"
>;

async function SessionNavbar(props: NavbarProps) {
  const session = await getLayoutSession();
  return <NavbarAndSidebar {...props} session={session} />;
}

async function SessionFooterFeedback({ label }: { label: string }) {
  const session = await getLayoutSession();

  return (
    <FeedbackModal session={session} variant="link">
      <span className="text-sm text-foreground/80 hover:text-primary cursor-pointer transition-colors">
        {label}
      </span>
    </FeedbackModal>
  );
}

function NavbarFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-16 w-full border-b border-border/50 bg-background/40 backdrop-blur-md"
    />
  );
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const [messages, t, tFeedback] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: "Navbar" }),
    getTranslations({ locale, namespace: "Feedback" }),
  ]);
  const navbarProps: NavbarProps = {
    HomeIntl: t("Home"),
    SignInIntl: t("Sign In"),
    WordListIntl: t("Word List"),
    WordBuilderIntl: t("WordBuilder"),
    TitleIntl: t("Title"),
    ProfileIntl: t("Profile"),
    DashboardIntl: t("Dashboard"),
    SavedWordsIntl: t("SavedWords"),
    MyRequestsIntl: t("MyRequests"),
    SearchHistoryIntl: t("SearchHistory"),
    LogoutIntl: t("Logout"),
    AnnouncementsIntl: t("Announcements"),
    ContributeWordIntl: t("ContributeWord"),
    DonateIntl: t("Donate"),
    PronunciationsIntl: t("Pronunciations"),
    ariaAvatar: t("ariaAvatar"),
    ariaMenu: t("ariaMenu"),
    ariaLanguages: t("ariaLanguages"),
    ariaSwitchTheme: t("ariaSwitchTheme"),
    ariaBlur: t("ariaBlur"),
    ContributeIntl: t("Contribute"),
    FeedbackIntl: t("Feedback"),
    SearchIntl: t("Search"),
    LearnIntl: t("Learn"),
    MainIntl: t("Main"),
    AccountIntl: t("Account"),
    PreferencesIntl: t("Preferences"),
    ForeignTermSuggestionsIntl: t("ForeignTermSuggestions"),
  };

  return (
    <html suppressHydrationWarning lang={locale}>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased relative`}>
        <TRPCReactProvider>
          <NextIntlClientProvider messages={messages}>
            <Providers>
                <OnlineStatusBridge />
                <WebMcpRegistrar />
                <AutocompleteSync />
                <PWAServiceWorker />
                <Suspense fallback={null}>
                  <NavigationProgressBar />
                </Suspense>
                <Suspense fallback={null}>
                  <ProfileGuard />
                </Suspense>
                <div className="flex flex-col min-h-screen">
                  <PreferencesInitializer />
                  <Suspense fallback={<NavbarFallback />}>
                    <SessionNavbar {...navbarProps} />
                  </Suspense>
                  <main className="relative w-full flex-grow flex min-h-[calc(100vh-var(--navbar-height))] pt-[env(safe-area-inset-top)] md:pt-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                    {/* ✨ Moved BackgroundGradient here */}
                    <BackgroundGradient />
                    {children}
                  </main>
                  <Footer
                    locale={locale}
                    feedbackAction={
                      <Suspense
                        fallback={
                          <span className="text-sm text-foreground/40">
                            {tFeedback("submitFeedback")}
                          </span>
                        }
                      >
                        <SessionFooterFeedback
                          label={tFeedback("submitFeedback")}
                        />
                      </Suspense>
                    }
                  />
                </div>
            </Providers>
            <Toaster />
          </NextIntlClientProvider >
        </TRPCReactProvider >
      </body >
    </html >
  );
}
