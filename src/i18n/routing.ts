import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, pathnames } from './pathnames';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: 'tr',
  alternateLinks: false,
  localePrefix: {
    mode: 'always',
    prefixes: {
      'en': '/en',
      'tr': '/tr',
    },
  },
  pathnames

})


export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
