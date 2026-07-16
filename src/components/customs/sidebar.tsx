import { BellIcon, Blocks, Gamepad2, GitPullRequestArrow, Globe, HandHeart, HeartHandshake, HistoryIcon, HomeIcon, LayoutDashboard, Layers, Link2, ListTree, LogIn, MicIcon, Monitor, StarIcon, WifiOff, Sun, Moon, Languages, LogOut, WalletCards, Zap } from 'lucide-react'
import React from 'react'
import { Link as NextIntlLink, usePathname } from "@/src/i18n/routing";
import { useRouter } from "@/src/i18n/routing";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import logo from "@/public/logo.svg";
import { authClient, Session } from '@/src/lib/auth-client';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Avatar } from '@heroui/react';
import { Button } from '@heroui/react';
import { useLocaleSwitchHref } from '@/src/hooks/useLocaleSwitchHref';
import { getPlayUrl } from '@/src/lib/play-url';

type SidebarProps = {
    session: Session | null,
    isSidebarOpen: boolean,
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>,
    ContributeIntl: string,
    LearnIntl: string,
    MainIntl: string,
    AccountIntl: string,
    PreferencesIntl: string,
    ariaSwitchTheme: string,
}

type SidebarLink = {
    href: React.ComponentProps<typeof NextIntlLink>["href"],
    externalHref?: string,
    label: string,
    icon: React.ReactNode,
    isActive?: boolean,
}

function SidebarSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <section className="space-y-1.5">
            <h3 className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                {title}
            </h3>
            <ul className="space-y-1">
                {children}
            </ul>
        </section>
    )
}

function SidebarLinkRow({
    item,
    onSelect,
}: {
    item: SidebarLink,
    onSelect: () => void,
}) {
    const linkClassName = cn(
        "group flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/68 transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
        item.isActive && "bg-primary/12 text-primary"
    );
    const content = <>
        <span className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-md text-foreground/50 transition-colors group-hover:text-primary",
            item.isActive && "bg-primary/10 text-primary"
        )}>
            {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">
            {item.label}
        </span>
    </>;

    return (
        <li>
            {item.externalHref ? (
                <a className={linkClassName} href={item.externalHref} onClick={onSelect}>{content}</a>
            ) : (
                <NextIntlLink className={linkClassName} href={item.href} onClick={onSelect}>{content}</NextIntlLink>
            )}
        </li>
    )
}

export default function Sidebar(
    {
        session,
        isSidebarOpen,
        setIsSidebarOpen,
        ContributeIntl,
        LearnIntl,
        MainIntl,
        AccountIntl,
        PreferencesIntl,
        ariaSwitchTheme,
    }: SidebarProps
) {
    const t = useTranslations()
    const { theme, setTheme } = useTheme();
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const languageSwitchHref = useLocaleSwitchHref();
    const [playHref, setPlayHref] = React.useState<string | null>(null);

    React.useEffect(() => {
        setPlayHref(getPlayUrl(window.location.origin, locale));
    }, [locale]);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.refresh();
        setIsSidebarOpen(false);
    };

    const closeSidebar = () => setIsSidebarOpen(false);
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const mainLinks: SidebarLink[] = [
        { href: '/', label: t("Navbar.Home"), icon: <HomeIcon className="h-5 w-5" />, isActive: pathname === "/" },
        { href: '/announcements', label: t("Navbar.Announcements"), icon: <BellIcon className="h-5 w-5" />, isActive: isActive("/announcements") },
        { href: '/offline-dictionary', label: t("Navbar.OfflineDictionary"), icon: <WifiOff className="h-5 w-5" />, isActive: isActive("/offline-dictionary") },
    ];
    const learnLinks: SidebarLink[] = [
        ...(playHref ? [{ href: '/games' as const, externalHref: playHref, label: t("Navbar.Play"), icon: <Gamepad2 className="h-5 w-5" /> }] : []),
        { href: '/games', label: t("Navbar.Games"), icon: <Gamepad2 className="h-5 w-5" />, isActive: isActive("/games") },
        { href: '/word-list', label: t("Navbar.Word List"), icon: <ListTree className="h-5 w-5" />, isActive: isActive("/word-list") },
        { href: '/word-builder', label: t("Navbar.WordBuilder"), icon: <Blocks className="h-5 w-5" />, isActive: isActive("/word-builder") },
        { href: '/flashcard-game', label: t("Navbar.FlashcardGame"), icon: <Layers className="h-5 w-5" />, isActive: isActive("/flashcard-game") },
        { href: '/word-matching', label: t("Navbar.WordMatchingGame"), icon: <Link2 className="h-5 w-5" />, isActive: isActive("/word-matching") },
        { href: '/speed-round', label: t("Navbar.SpeedRoundGame"), icon: <Zap className="h-5 w-5" />, isActive: isActive("/speed-round") },
    ];
    const contributeLinks: SidebarLink[] = [
        { href: '/contribute-word', label: t("Navbar.ContributeWord"), icon: <HeartHandshake className="h-5 w-5" />, isActive: isActive("/contribute-word") },
        { href: '/donate', label: t("Navbar.Donate"), icon: <WalletCards className="h-5 w-5" />, isActive: isActive("/donate") },
        { href: '/pronunciation-voting', label: t("Navbar.Pronunciations"), icon: <MicIcon className="h-5 w-5" />, isActive: isActive("/pronunciation-voting") },
        { href: '/feedback', label: t("Navbar.Feedback"), icon: <HandHeart className="h-5 w-5" />, isActive: isActive("/feedback") },
        { href: '/foreign-term-suggestions', label: t("Navbar.ForeignTermSuggestions"), icon: <Globe className="h-5 w-5" />, isActive: isActive("/foreign-term-suggestions") },
    ];
    const accountLinks: SidebarLink[] = session?.user?.id ? [
        {
            href: {
                pathname: "/profile/[id]",
                params: { id: session.user.id },
            },
            label: session.user.name || t("Navbar.Profile"),
            icon: (
                <Avatar
                    showFallback
                    src={session.user.image ?? "https://images.unsplash.com/broken"}
                    size="sm"
                    className="h-5 w-5"
                />
            ),
            isActive: isActive("/profile"),
        },
        { href: '/saved-words', label: t("Navbar.SavedWords"), icon: <StarIcon className="h-5 w-5" />, isActive: isActive("/saved-words") },
        { href: '/search-history', label: t("Navbar.SearchHistory"), icon: <HistoryIcon className="h-5 w-5" />, isActive: isActive("/search-history") },
        { href: '/my-requests', label: t("Navbar.MyRequests"), icon: <GitPullRequestArrow className="h-5 w-5" />, isActive: isActive("/my-requests") },
    ] : [
        { href: '/signin', label: t("Navbar.Sign In"), icon: <LogIn className="h-5 w-5" />, isActive: isActive("/signin") },
    ];

    if (session?.user?.role === "admin") {
        accountLinks.push({
            href: "/dashboard",
            label: t("Navbar.Dashboard"),
            icon: <LayoutDashboard className="h-5 w-5" />,
            isActive: isActive("/dashboard"),
        });
    }

    const themeOptions = [
        { key: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
        { key: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
        { key: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
    ];

    return (
        <>
            <Sheet open={isSidebarOpen} onOpenChange={(isOpen) => {
                setIsSidebarOpen(isOpen)
            }}>
                <SheetContent hideCloseButton={true} side={'left'} className="flex flex-col w-[240px] sm:w-[280px] max-sm:pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] max-sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sidebar overflow-y-auto overflow-x-hidden overscroll-contain">
                    <SheetHeader>
                        <SheetTitle className='flex items-center gap-2 justify-center text-center text-primary font-bold'>
                            <Image src={logo} alt="Turkish Dictionary Logo" className="h-6 w-6" />{t("Navbar.Title")}
                        </SheetTitle>
                    </SheetHeader>
                    <nav className='flex flex-col flex-1 gap-5 pt-5'>
                        <SidebarSection title={MainIntl}>
                            {mainLinks.map((item) => (
                                <SidebarLinkRow key={String(item.href)} item={item} onSelect={closeSidebar} />
                            ))}
                        </SidebarSection>

                        <SidebarSection title={LearnIntl}>
                            {learnLinks.map((item) => (
                                <SidebarLinkRow key={String(item.href)} item={item} onSelect={closeSidebar} />
                            ))}
                        </SidebarSection>

                        <SidebarSection title={ContributeIntl}>
                            {contributeLinks.map((item) => (
                                <SidebarLinkRow key={String(item.href)} item={item} onSelect={closeSidebar} />
                            ))}
                        </SidebarSection>

                        <SidebarSection title={AccountIntl}>
                            {accountLinks.map((item) => (
                                <SidebarLinkRow key={typeof item.href === "string" ? item.href : item.label} item={item} onSelect={closeSidebar} />
                            ))}
                            {session?.user && (
                                <li>
                                    <Button
                                        className="min-h-11 w-full justify-start gap-3 rounded-lg bg-danger/10 px-2.5 text-danger hover:bg-danger/15"
                                        variant="flat"
                                        onPress={handleSignOut}
                                        startContent={<span className="grid h-8 w-8 shrink-0 place-items-center rounded-md"><LogOut className="h-5 w-5" /></span>}
                                    >
                                        <span className="min-w-0 flex-1 truncate text-left">{t("Navbar.Logout")}</span>
                                    </Button>
                                </li>
                            )}
                        </SidebarSection>

                        <section className="mt-1 space-y-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                            <h3 className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-foreground/45">
                                {PreferencesIntl}
                            </h3>
                            <div className="grid grid-cols-3 gap-1 rounded-xl border border-default-200 bg-default-100/60 p-1 dark:bg-default-50/60" role="group" aria-label={ariaSwitchTheme}>
                                {themeOptions.map((option) => {
                                    const isSelected = (theme ?? "system") === option.key;

                                    return (
                                        <Button
                                            key={option.key}
                                            className={cn(
                                                "h-10 w-full min-w-0 max-w-none rounded-lg border-none px-0 text-foreground/60",
                                                isSelected && "bg-background text-primary shadow-sm"
                                            )}
                                            variant="light"
                                            isIconOnly
                                            size="sm"
                                            onPress={() => setTheme(option.key)}
                                            aria-label={option.label}
                                            aria-pressed={isSelected}
                                        >
                                            {option.icon}
                                        </Button>
                                    )
                                })}
                            </div>

                            <NextIntlLink
                                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-default-200 bg-default-100/70 px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-primary/10 hover:text-foreground dark:bg-default-50/70"
                                // @ts-ignore
                                href={languageSwitchHref}
                                locale={locale === "en" ? "tr" : "en"}
                                data-skip-navigation-progress
                                onClick={closeSidebar}
                            >
                                <Languages className="h-5 w-5 text-primary" />
                                <span className="min-w-0 truncate">{locale === "en" ? "Türkçe'ye Geç" : "Switch to English"}</span>
                            </NextIntlLink>
                        </section>
                    </nav>
                </SheetContent>
            </Sheet >
        </>
    )
}
