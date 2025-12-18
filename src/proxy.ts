import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
const publicPages = [
  "/",
  "/search",
  "/search/(.*)",
  "/search(.*)",
  "/signup",
  "/signin",
  "/forgot-password",
  "/reset-password/(.*)",
  "/arama",
  "/arama/(.*)",
  "/giris-yap",
  "/kayit-ol",
  "/sifremi-unuttum",
  "/sifreyi-yenile/(.*)",
];
const handleI18nRouting = createMiddleware(routing);
export default handleI18nRouting

export const config = {
  // Matcher entries are linked with a logical "or", therefore
  // if one of them matches, the middleware will be invoked.
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',

    // However, match all pathnames within `/search` or `/arama`, optionally with a locale prefix
    '/([\\w-]+)?/search/(.+)',

    '/([\\w-]+)?/arama/(.+)'
  ]
};