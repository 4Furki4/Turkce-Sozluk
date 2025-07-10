"use client"
import { BellIcon, GitPullRequestArrow, HandHeart, HeartHandshake, HistoryIcon, HomeIcon, LayoutDashboard, ListTree, LogIn, MicIcon, StarIcon, UserIcon, WifiOff } from 'lucide-react'
import React from 'react'
import { Link as NextIntlLink } from "@/src/i18n/routing";
import { Session } from 'next-auth';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import logo from "@/public/logo.svg";
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
    return (
        <>
            <Sheet open={isSidebarOpen} onOpenChange={(isOpen) => {
                setIsSidebarOpen(isOpen)
            }}>
                <SheetContent hideCloseButton={true} side={'left'} className="w-[240px] sm:w-[280px] max-sm:p-0 max-sm:pt-8 sidebar">
                    <SheetHeader>
                        <SheetTitle className='flex items-center gap-2 justify-center text-center text-primary font-bold'>
                            <Image src={logo} alt="Turkish Dictionary Logo" className="h-6 w-6" />{t("Navbar.Title")}
                        </SheetTitle>
                    </SheetHeader>
                    <nav className='p-5'>
                        <ul className='sticky top-4 max-h-max space-y-4'>
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
                                <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={'/offline-dictionary'} onClick={() => setIsSidebarOpen(false)}>
                                    <WifiOff className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.OfflineDictionary")}</span>
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
                            <Separator />
                            {session?.user?.id ? (
                                <>
                                    <li>
                                        <NextIntlLink className='flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 rounded-sm' href={{
                                            pathname: "/profile/[id]",
                                            params: { id: session?.user?.id },
                                        }} onClick={() => setIsSidebarOpen(false)}>
                                            <UserIcon className="h-6 w-6" /> <span className={`text-nowrap`}>{t("Navbar.Profile")}</span>
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
                    </nav>
                </SheetContent>
            </Sheet >
        </>
    )
}
