import { useLocale } from 'next-intl';

export default function IOSPWAMeta() {
  const locale = useLocale();
  const isEnglish = locale === 'en';

  const appTitle = isEnglish ? 'Turkish Dictionary' : 'Türkçe Sözlük';

  return (
    <>
      {/* iOS PWA Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={appTitle} />
      <meta name="apple-touch-fullscreen" content="yes" />

      <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />

      {/* Apple Touch Icon Precomposed - Fallback for older iOS */}
      <link rel="apple-touch-icon-precomposed" href="/icons/apple-icon-180.png" />
      <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/icons/apple-icon-180.png" />

      {/* Standard PWA Icons */}
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/apple-icon-180.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/apple-icon-180.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/manifest-icon-192.maskable.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/manifest-icon-512.maskable.png" />

      {/* Manifest */}
      <link rel="manifest" href="/manifest.json" />

      {/* Theme Colors */}
      <meta name="theme-color" content="#a91011" />
      <meta name="msapplication-TileColor" content="#a91011" />
      <meta name="msapplication-navbutton-color" content="#a91011" />

      {/* Additional iOS Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
    </>
  );
}
