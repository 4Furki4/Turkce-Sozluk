import { BellIcon, Blocks, GitPullRequestArrow, Globe, HandHeart, HeartHandshake, HistoryIcon, HomeIcon, LayoutDashboard, Layers, Link2, ListTree, LogIn, MicIcon, StarIcon, UserIcon, WifiOff, Sun, Moon, Sparkles, Sparkle, Languages, LogOut, Zap } from 'lucide-react'
import React from 'react'
import { Link as NextIntlLink, useRouter } from "@/src/i18n/routing";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from '@/components/ui/separator';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import logo from "@/public/logo.svg";
import { authClient, Session } from '@/src/lib/auth-client';
import { useTheme } from 'next-themes';
import { useSnapshot } from 'valtio';
import { preferencesState, toggleBlur } from '@/src/store/preferences';
import { cn } from '@/lib/utils';
import { Avatar } from '@heroui/react';
import { Button } from '@heroui/react';
import { useLocaleSwitchHref } from '@/src/hooks/useLocaleSwitchHref';
export default function Sidebar(
    {
        session,
        isSidebarOpen,
        setIsSidebarOpen
    }
        : {
            session: Session | null,
            isSidebarOpen: boolean,
            setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
        }
) {
    const t = useTranslations()
    const { theme, setTheme } = useTheme();
    const locale = useLocale();
    const router = useRouter();
    const snap = useSnapshot(preferencesState);
    const languageSwitchHref = useLocaleSwitchHref();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.refresh();
        setIsSidebarOpen(false);
    };
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
                    <nav className='flex flex-col flex-1 pt-4'>
                        <ul className='space-y-4'>
                            <Separator />
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/'} onClick={() => setIsSidebarOpen(false)}>
                                    <HomeIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Home")}</span>
                                </NextIntlLink>
                            </li>

                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/announcements'} onClick={() => setIsSidebarOpen(false)}>
                                    <BellIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Announcements")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/word-list'} onClick={() => setIsSidebarOpen(false)}>
                                    <ListTree className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Word List")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/word-builder'} onClick={() => setIsSidebarOpen(false)}>
                                    <Blocks className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.WordBuilder")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/offline-dictionary'} onClick={() => setIsSidebarOpen(false)}>
                                    <WifiOff className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.OfflineDictionary")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/flashcard-game'} onClick={() => setIsSidebarOpen(false)}>
                                    <Layers className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.FlashcardGame")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/word-matching'} onClick={() => setIsSidebarOpen(false)}>
                                    <Link2 className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.WordMatchingGame")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/speed-round'} onClick={() => setIsSidebarOpen(false)}>
                                    <Zap className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.SpeedRoundGame")}</span>
                                </NextIntlLink>
                            </li>
                            <Separator />
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/contribute-word'} onClick={() => setIsSidebarOpen(false)}>
                                    <HeartHandshake className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.ContributeWord")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/pronunciation-voting'} onClick={() => setIsSidebarOpen(false)}>
                                    <MicIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Pronunciations")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/feedback'} onClick={() => setIsSidebarOpen(false)}>
                                    <HandHeart className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Feedback")}</span>
                                </NextIntlLink>
                            </li>
                            <li>
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/foreign-term-suggestions'} onClick={() => setIsSidebarOpen(false)}>
                                    <Globe className="h-6 w-6 flex-shrink-0" /> <span className={`text-nowrap`}>{t("Navbar.ForeignTermSuggestions")}</span>
                                </NextIntlLink>
                            </li>
                            <Separator />
                            {session?.user?.id ? (
                                <>
                                    <li>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={{
                                            pathname: "/profile/[id]",
                                            params: { id: session?.user?.id },
                                        }} onClick={() => setIsSidebarOpen(false)}>
                                            <Avatar
                                                showFallback
                                                src={session.user.image ?? "https://images.unsplash.com/broken"}
                                                size="sm"
                                                className="w-6 h-6"
                                            />
                                            <span className={`text-nowrap`}>{session.user.name || t("Navbar.Profile")}</span>
                                        </NextIntlLink>
                                    </li>
                                    <li className='flex'>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/saved-words'} onClick={() => setIsSidebarOpen(false)}>
                                            <StarIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.SavedWords")}</span>
                                        </NextIntlLink>
                                    </li>
                                    <li>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/search-history'} onClick={() => setIsSidebarOpen(false)}>
                                            <HistoryIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.SearchHistory")}</span>
                                        </NextIntlLink>
                                    </li>
                                    <li>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/my-requests'} onClick={() => setIsSidebarOpen(false)}>
                                            <GitPullRequestArrow className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.MyRequests")}</span>
                                        </NextIntlLink>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/signin'} onClick={() => setIsSidebarOpen(false)}>
                                            <LogIn className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Sign In")}</span>
                                        </NextIntlLink>
                                    </li>
                                </>
                            )}


                            {session?.user?.role === "admin" ? (
                                <li>
                                    <NextIntlLink href={"/dashboard"} className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' onClick={() => setIsSidebarOpen(false)}>
                                        <LayoutDashboard className='h-6 w-6' /> <span className={`text-nowrap`}>{t("Navbar.Dashboard")}</span>
                                    </NextIntlLink>
                                </li>
                            ) : null}
                        </ul>
                        <div className="mt-6 sm:mt-auto px-1 py-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] space-y-4">
                            <Separator />
                            <div className="flex items-center justify-between gap-2">
                                {/* Theme Toggle */}
                                <Button
                                    className="flex-1 bg-default-100 dark:bg-default-50 border border-default-200"
                                    variant="flat"
                                    onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
                                >
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                        <span className="text-sm font-medium">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                                    </div>
                                </Button>

                                {/* Blur Toggle */}
                                <Button
                                    className="flex-1 bg-default-100 dark:bg-default-50 border border-default-200"
                                    variant="flat"
                                    onPress={toggleBlur}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-[1.2rem] h-[1.2rem]">
                                            <Sparkles className={cn("absolute inset-0 h-[1.2rem] w-[1.2rem] transition-all", snap.isBlurEnabled ? "rotate-0 scale-100" : "rotate-90 scale-0")} />
                                            <Sparkle className={cn("absolute inset-0 h-[1.2rem] w-[1.2rem] transition-all", snap.isBlurEnabled ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
                                        </div>
                                        <span className="text-sm font-medium">Blur</span>
                                    </div>
                                </Button>
                            </div>

                            {/* Language Toggle */}

                            <NextIntlLink
                                className="flex items-center justify-center gap-2 w-full rounded-medium p-2 bg-default-100 dark:bg-default-50 border border-default-200 hover:bg-default-200 transition-colors"
                                // @ts-ignore
                                href={languageSwitchHref}
                                locale={locale === "en" ? "tr" : "en"}
                            >
                                <Languages className="w-5 h-5" />
                                <span className="font-medium">{locale === "en" ? "Türkçe'ye Geç" : "Switch to English"}</span>
                            </NextIntlLink>

                            {/* Sign Out Button (if logged in) */}
                            {session?.user && (
                                <Button
                                    className="w-full bg-danger/10 text-danger hover:bg-danger/20"
                                    variant="flat"
                                    onPress={handleSignOut}
                                    startContent={<LogOut className="w-4 h-4" />}
                                >
                                    {t("Navbar.Logout")}
                                </Button>
                            )}
                        </div>
                    </nav>
                </SheetContent>
            </Sheet >
        </>
    )
}
