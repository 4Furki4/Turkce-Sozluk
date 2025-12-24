import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ["en", "tr"] as const;
export const localePrefix = "as-needed";

// The `pathnames` object holds pairs of internal
// and external paths, separated by locale.
export const routing = defineRouting({
  locales: ["en", "tr"],
  defaultLocale: 'tr',
  localePrefix: {
    mode: 'always',
    prefixes: {
      'en': '/en',
      'tr': '/tr',
    },
  },
  pathnames: {
    // If all locales use the same pathname, a
    // single external path can be provided.
    "/": "/",

    // If locales use different paths, you can
    // specify each external path per locale.
    "/signin": {
      "en": "/signin",
      "tr": "/giris-yap",
    },
    "/word-list": {
      "en": "/word-list",
      "tr": "/kelime-listesi",
    },
    "/saved-words": {
      "en": "/saved-words",
      "tr": "/kaydedilen-kelimeler",
    },
    "/contribute-word": {
      "en": "/contribute-word",
      "tr": "/kelime-katkisi",
    },
    "/dashboard": {
      "en": "/dashboard",
      "tr": "/panel",
    },
    "/dashboard/create-word": {
      "en": "/dashboard/create-word",
      "tr": "/panel/kelime-ekle",
    },
    "/dashboard/user-list": {
      "en": "/dashboard/user-list",
      "tr": "/panel/kullanicilar",
    },
    "/dashboard/dynamic-parameters": {
      "en": "/dashboard/dynamic-parameters",
      "tr": "/panel/dinamik-parametreler",
    },
    "/dashboard/dynamic-parameters/word-attributes": {
      "en": "/dashboard/dynamic-parameters/word-attributes",
      "tr": "/panel/dinamik-parametreler/kelime-ozellikleri",
    },
    "/dashboard/dynamic-parameters/meaning-attributes": {
      "en": "/dashboard/dynamic-parameters/meaning-attributes",
      "tr": "/panel/dinamik-parametreler/anlam-ozellikleri",
    },
    "/dashboard/dynamic-parameters/authors": {
      "en": "/dashboard/dynamic-parameters/authors",
      "tr": "/panel/dinamik-parametreler/yazarlar",
    },
    "/dashboard/dynamic-parameters/part-of-speech": {
      "en": "/dashboard/dynamic-parameters/part-of-speech",
      "tr": "/panel/dinamik-parametreler/kelime-turu",
    },
    "/dashboard/dynamic-parameters/languages": {
      "en": "/dashboard/dynamic-parameters/languages",
      "tr": "/panel/dinamik-parametreler/diller",
    },
    "/dashboard/dynamic-parameters/roots": {
      "en": "/dashboard/dynamic-parameters/roots",
      "tr": "/panel/dinamik-parametreler/kökler",
    },
    "/dashboard/feedback": {
      "en": "/dashboard/feedback",
      "tr": "/panel/geri-bildirim",
    },
    "/search": {
      "en": "/search",
      "tr": "/arama",
    },
    "/search/[word]": {
      "en": "/search/[word]",
      "tr": "/arama/[word]",
    },
    "/profile/[id]": {
      "en": "/profile/[id]",
      "tr": "/profil/[id]",
    },
    "/complete-profile": {
      "en": "/complete-profile",
      "tr": "/profil-tamamla",
    },
    '/my-requests': {
      "en": "/my-requests",
      "tr": "/isteklerim",
    },
    '/my-requests/[id]': {
      "en": "/my-requests/[id]",
      "tr": "/isteklerim/[id]",
    },
    "/dashboard/requests": {
      "en": "/dashboard/requests",
      "tr": "/panel/istekler",
    },
    "/dashboard/requests/[id]": {
      "en": "/dashboard/requests/[id]",
      "tr": "/panel/istekler/[id]",
    },
    "/dashboard/word-relations": {
      "en": "/dashboard/word-relations",
      "tr": "/panel/kelime-ilişkileri",
    },
    "/search-history": {
      "en": "/search-history",
      "tr": "/arama-gecmisi",
    },
    "/announcements": {
      "en": "/announcements",
      "tr": "/duyurular",
    },
    "/announcements/[slug]": {
      "en": "/announcements/[slug]",
      "tr": "/duyurular/[slug]",
    },
    "/dashboard/announcements": {
      "en": "/dashboard/announcements",
      "tr": "/dashboard/duyurular",
    },
    "/dashboard/announcements/new": {
      "en": "/dashboard/announcements/new",
      "tr": "/dashboard/duyurular/yeni",
    },
    "/dashboard/announcements/[id]/edit": {
      "en": "/dashboard/announcements/[id]/edit",
      "tr": "/dashboard/duyurular/[id]/duzenle",
    },
    "/dashboard/daily-words": {
      "en": "/dashboard/daily-words",
      "tr": "/dashboard/gundelik-kelimeler",
    },
    "/dashboard/daily-words/[id]/edit": {
      "en": "/dashboard/daily-words/[id]/edit",
      "tr": "/dashboard/gundelik-kelimeler/[id]/duzenle",
    },
    "/dashboard/badges": {
      "en": "/dashboard/badges",
      "tr": "/panel/rozetler",
    },
    "/feedback": {
      "en": "/feedback",
      "tr": "/geri-bildirim",
    },
    "/feedback/new": {
      "en": "/feedback/new",
      "tr": "/geri-bildirim/yeni",
    },
    "/terms-of-service": {
      "en": "/terms-of-service",
      "tr": "/kullanim-sartlari",
    },
    "/privacy-policy": {
      "en": "/privacy-policy",
      "tr": "/gizlilik-politikasi",
    },
    "/pronunciation-voting": {
      "en": "/pronunciation-voting",
      "tr": "/telaffuz-oylama",
    },
    "/~offline": {
      "en": "/~offline",
      "tr": "/~çevrim-dışı",
    },
    "/offline-dictionary": {
      "en": "/offline-dictionary",
      "tr": "/çevrim-dışı-sözlük",
    },
    "/galati-meshur/[id]": {
      "en": "/galati-meshur/[id]",
      "tr": "/galati-meshur/[id]",
    },
    "/flashcard-game": {
      "en": "/flashcard-game",
      "tr": "/kelime-kartlari",
    },
  }

})


export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
