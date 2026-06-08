"use client"
import React from 'react';
import { Link, usePathname } from "@/src/i18n/routing";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  ListChecks,
  MessageSquareText,
  Network,
  Settings,
  Settings2,
  SpellCheck,
  Users,
} from "lucide-react";
import { useLocale } from 'next-intl';

type DashboardHref =
  | "/dashboard"
  | "/dashboard/user-list"
  | "/dashboard/search-history"
  | "/dashboard/badges"
  | "/dashboard/word-relations"
  | "/dashboard/announcements"
  | "/dashboard/dynamic-parameters"
  | "/dashboard/requests"
  | "/dashboard/feedback"
  | "/dashboard/daily-words"
  | "/dashboard/galatimeshur"
  | "/dashboard/misspellings";

type DashboardLink = {
  href: DashboardHref;
  label: string;
  icon: React.ReactNode;
};

type DashboardLinkGroup = {
  key: string;
  label: string;
  icon: React.ReactNode;
  links: DashboardLink[];
};

const iconClassName = "h-4 w-4";

const getLinkGroups: (locale: string) => DashboardLinkGroup[] = (locale) => [
  {
    key: "content",
    label: locale === "en" ? "Content" : "İçerik",
    icon: <BookOpen className={iconClassName} />,
    links: [
      {
        href: "/dashboard",
        label: locale === "en" ? "Word List" : "Kelimeler",
        icon: <ListChecks className={iconClassName} />,
      },
      {
        href: "/dashboard/word-relations",
        label: locale === "en" ? "Word Relations" : "Kelime İlişkileri",
        icon: <Network className={iconClassName} />,
      },
      {
        href: "/dashboard/daily-words",
        label: locale === "en" ? "Daily Words" : "Günün Kelimesi",
        icon: <CalendarDays className={iconClassName} />,
      },
      {
        href: "/dashboard/galatimeshur",
        label: locale === "en" ? "Galatımeşhur" : "Galatımeşhur",
        icon: <FileText className={iconClassName} />,
      },
      {
        href: "/dashboard/misspellings",
        label: locale === "en" ? "Misspellings" : "Yazım Yanlışları",
        icon: <SpellCheck className={iconClassName} />,
      },
    ],
  },
  {
    key: "people",
    label: locale === "en" ? "People" : "Kullanıcılar",
    icon: <Users className={iconClassName} />,
    links: [
      {
        href: "/dashboard/user-list",
        label: locale === "en" ? "User List" : "Kullanıcı Listesi",
        icon: <Users className={iconClassName} />,
      },
      {
        href: "/dashboard/search-history",
        label: locale === "en" ? "Search History" : "Arama Geçmişi",
        icon: <ListChecks className={iconClassName} />,
      },
      {
        href: "/dashboard/badges",
        label: locale === "en" ? "Badges" : "Rozetler",
        icon: <Award className={iconClassName} />,
      },
    ],
  },
  {
    key: "operations",
    label: locale === "en" ? "Operations" : "Operasyon",
    icon: <Settings2 className={iconClassName} />,
    links: [
      {
        href: "/dashboard/announcements",
        label: locale === "en" ? "Announcements" : "Duyurular",
        icon: <FileText className={iconClassName} />,
      },
      {
        href: "/dashboard/dynamic-parameters",
        label: locale === "en" ? "Dynamic Parameters" : "Dinamik Parametreler",
        icon: <Settings className={iconClassName} />,
      },
      {
        href: "/dashboard/requests",
        label: locale === "en" ? "Requests" : "İstekler",
        icon: <ListChecks className={iconClassName} />,
      },
      {
        href: "/dashboard/feedback",
        label: locale === "en" ? "Feedback" : "Geri Bildirim",
        icon: <MessageSquareText className={iconClassName} />,
      },
    ],
  },
];


export default function DashboardLinks() {
  const pathname = usePathname()
  const locale = useLocale()
  const groups = getLinkGroups(locale);
  const currentLink = groups.flatMap((group) => group.links).find((link) => link.href === pathname);

  return (
    <nav aria-label={locale === "en" ? "Dashboard navigation" : "Panel navigasyonu"} className="mb-5 flex flex-wrap items-center gap-3 border-b border-border/70 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((group) => {
          const isActiveGroup = group.links.some((link) => link.href === pathname);

          return (
            <Dropdown key={group.key} radius="md">
              <DropdownTrigger>
                <Button
                  color={isActiveGroup ? "primary" : "default"}
                  variant={isActiveGroup ? "flat" : "bordered"}
                  radius="md"
                  size="sm"
                  startContent={group.icon}
                  endContent={<ChevronDown className="h-4 w-4" />}
                  className="border-primary/30 bg-background/40"
                >
                  {group.label}
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label={group.label}
                selectedKeys={new Set([pathname])}
                selectionMode="single"
                variant="flat"
              >
                <DropdownSection title={group.label}>
                  {group.links.map((link) => (
                    <DropdownItem
                      key={link.href}
                      color={pathname === link.href ? "primary" : "default"}
                      textValue={link.label}
                      className="p-0"
                    >
                      <Link
                        href={link.href}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-foreground"
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    </DropdownItem>
                  ))}
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          );
        })}
      </div>
      {currentLink ? (
        <div className="ml-auto min-w-0 rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-sm text-muted-foreground">
          <span className="text-foreground">{currentLink.label}</span>
        </div>
      ) : null}
    </nav>
  )
}
