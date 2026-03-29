import React from 'react'
import { getTranslations } from 'next-intl/server'
import { FeedbackModal } from "@/src/components/customs/modals/add-feedback";
import { Link as NextIntlLink } from "@/src/i18n/routing";
import { Github } from 'lucide-react';
import { Session } from '@/src/lib/auth';
import Image from "next/image";
import logo from "@/public/svg/navbar/logo.svg";

export default async function Footer({ session }: { session: Session | null }) {
    const t = await getTranslations("Footer");
    const tFeedback = await getTranslations("Feedback");
    const tNavbar = await getTranslations("Navbar"); // Fetching for Title

    const footerLinks = {
        dictionary: [
            { href: "/word-list" as const, label: t("links.wordList") },
            { href: "/announcements" as const, label: t("links.announcements") },
            { href: "/offline-dictionary" as const, label: t("links.offlineDictionary") },
        ],
        games: [
            { href: "/flashcard-game" as const, label: t("links.flashcardGame") },
            { href: "/word-matching" as const, label: t("links.wordMatchingGame") },
            { href: "/speed-round" as const, label: t("links.speedRoundGame") },
            { href: "/leaderboards" as const, label: t("links.leaderboards") },
        ],
        community: [
            { href: "/contribute-word" as const, label: t("links.contributeWord") },
            { href: "/pronunciation-voting" as const, label: t("links.pronunciations") },
            { href: "/feedback" as const, label: t("links.seeFeedback") },
            { href: "/foreign-term-suggestions" as const, label: t("links.foreignTermSuggestions") },
        ],
        legal: [
            { href: "/privacy-policy" as const, label: t("links.privacy") },
            { href: "/terms-of-service" as const, label: t("links.terms") },
        ]
    };

    return (
        <footer className="mt-auto bg-background/50 backdrop-blur-md border-t border-border px-2 pb-24 md:pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
                    {/* Brand Section */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Image src={logo} alt="Turkish Dictionary Logo" className="h-8 w-8" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                                {tNavbar("Title")}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            {t("description")}
                        </p>
                        <div className="pt-2">
                            <a
                                href="https://github.com/4furki4/Turkish-Dictionary"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Github size={18} />
                                <span className="font-medium">GitHub</span>
                            </a>
                        </div>
                    </div>

                    {/* Links Section */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {/* Dictionary Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                {t("headings.dictionary")}
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.dictionary.map(link => (
                                    <li key={link.href}>
                                        <NextIntlLink href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                            {link.label}
                                        </NextIntlLink>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Games Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                {t("headings.games")}
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.games.map(link => (
                                    <li key={link.href}>
                                        <NextIntlLink href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                            {link.label}
                                        </NextIntlLink>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Community Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                {t("headings.community")}
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.community.map(link => (
                                    <li key={link.href}>
                                        <NextIntlLink href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                            {link.label}
                                        </NextIntlLink>
                                    </li>
                                ))}
                                <li>
                                    <FeedbackModal session={session} variant="link">
                                        <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                            {tFeedback("submitFeedback")}
                                        </span>
                                    </FeedbackModal>
                                </li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
                                {t("headings.legal")}
                            </h3>
                            <ul className="space-y-3">
                                {footerLinks.legal.map(link => (
                                    <li key={link.href}>
                                        <NextIntlLink href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                            {link.label}
                                        </NextIntlLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground text-center md:text-left">
                        © {new Date().getFullYear()} {t("licenseInfo")}
                    </p>
                </div>
            </div>
        </footer>
    )
}

