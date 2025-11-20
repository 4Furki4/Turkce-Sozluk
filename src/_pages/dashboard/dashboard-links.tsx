"use client"
import React from 'react';
import { Link, usePathname } from "@/src/i18n/routing";
import { Link as NextUILink } from "@heroui/react";
import { Settings, Award } from "lucide-react";
import { useLocale } from 'next-intl';

const getLinks: (locale: string) => { href: string; label: string; icon?: React.ReactNode; }[] = (locale) => [
  {
    href: "/dashboard",
    label: locale === "en" ? "Word List" : "Kelimeler",
  },
  {
    href: "/dashboard/user-list",
    label: locale === "en" ? "User List" : "Kullanıcı Listesi",
  },
  {
    href: "/dashboard/badges",
    label: locale === "en" ? "Badges" : "Rozetler",
    icon: <Award className="w-5 h-5" />,
  },
  {
    href: "/dashboard/word-relations",
    label: locale === "en" ? "Word Relations" : "Kelime İlişkileri",
  },
  {
    href: "/dashboard/announcements",
    label: locale === "en" ? "Announcements" : "Duyurular",
  },
  {
    href: "/dashboard/dynamic-parameters",
    label: locale === "en" ? "Dynamic Parameters" : "Dinamik Parametreler",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/dashboard/requests",
    label: locale === "en" ? "Requests" : "İstekler",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/dashboard/feedback",
    label: locale === "en" ? "Feedback" : "Geri Bildirim",
    icon: <Settings className="w-5 h-5" />,
  },
  {
    href: "/dashboard/daily-words",
    label: locale === "en" ? "Daily Words" : "Günün Kelimesi",
  },
  {
    href: "/dashboard/galatimeshur",
    label: locale === "en" ? "Galatımeşhur" : "Galatımeşhur",
  },
  {
    href: "/dashboard/misspellings",
    label: locale === "en" ? "Misspellings" : "Yazım Yanlışları",
  },
]


export default function DashboardLinks() {
  const pathname = usePathname()
  const locale = useLocale()
  return (
    <div className='flex gap-4 items-center max-md:overflow-scroll max-md:scroll-y-hidden pr-4'>
      {getLinks(locale).map((link, index) => (
        <NextUILink className='whitespace-nowrap' as={Link} href={link.href} key={index} underline={pathname === link.href ? "always" : "hover"}>
          {link.label}
        </NextUILink>
      ))}
    </div>
  )
}
