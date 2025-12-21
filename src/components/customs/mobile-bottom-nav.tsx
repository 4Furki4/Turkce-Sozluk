"use client";

import React, { useState } from "react";
import { usePathname, Link } from "@/src/i18n/routing";
import { Home, BookOpen, Search as SearchIcon, Star, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileSearchDrawer from "./search/mobile-search-drawer";

interface MobileBottomNavProps {
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    HomeIntl: string;
    WordListIntl: string;
    ContributeWordIntl: string; // Keeping this prop but maybe using it for Search tooltip or similar if needed, or just relying on SearchIntl
    SavedWordsIntl: string;
    ariaMenu: string;
    SearchIntl: string; // New Prop
}

export default function MobileBottomNav({
    setIsSidebarOpen,
    HomeIntl,
    WordListIntl,
    SavedWordsIntl,
    ariaMenu,
    SearchIntl
}: MobileBottomNavProps) {
    const pathname = usePathname();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const navItems = [
        {
            href: "/",
            icon: Home,
            label: HomeIntl,
            isActive: pathname === "/",
        },
        {
            href: "/word-list",
            icon: BookOpen,
            label: WordListIntl,
            isActive: pathname === "/word-list",
        },
        {
            isSearch: true,
            icon: SearchIcon,
            label: SearchIntl,
            isActive: isSearchOpen,
            isPrimary: true,
        },
        {
            href: "/saved-words",
            icon: Star,
            label: SavedWordsIntl,
            isActive: pathname === "/saved-words",
        },
    ];

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;

                        if (item.isSearch) {
                            return (
                                <button
                                    key={index}
                                    onClick={() => setIsSearchOpen(true)}
                                    className="relative -top-5"
                                    aria-label={item.label}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
                                        "bg-primary text-primary-foreground",
                                        item.isActive && "ring-2 ring-offset-2 ring-primary ring-offset-background"
                                    )}>
                                        <Icon className="w-7 h-7" strokeWidth={2.5} />
                                    </div>
                                    <span className="sr-only">{item.label}</span>
                                </button>
                            );
                        }

                        // Standard Link Item
                        return (
                            <Link
                                key={index}
                                href={item.href as any}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
                                    "text-muted-foreground hover:text-foreground",
                                    item.isActive && "text-primary hover:text-primary"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "w-6 h-6 mb-1 transition-all",
                                        item.isActive && "fill-current"
                                    )}
                                    strokeWidth={item.isActive ? 2.5 : 2}
                                />
                                <span className="text-[10px] font-medium opacity-80">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
                        aria-label={ariaMenu}
                    >
                        <Menu className="w-6 h-6 mb-1" strokeWidth={2} />
                        <span className="text-[10px] font-medium opacity-80">
                            {ariaMenu}
                        </span>
                    </button>
                </div>
            </div>

            <MobileSearchDrawer
                isOpen={isSearchOpen}
                onOpenChange={setIsSearchOpen}
                SearchIntl={SearchIntl}
            />
        </>
    );
}
