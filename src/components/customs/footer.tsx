import React from 'react'
import { getTranslations } from 'next-intl/server'
import { FeedbackModal } from "@/src/components/customs/modals/add-feedback";
import { Link } from '@heroui/react';
import { Github } from 'lucide-react'; // Example icon
import { Session } from '@/src/lib/auth';

export default async function Footer({ session }: { session: Session | null }) {
    const t = await getTranslations("Footer");
    const tFeedback = await getTranslations("Feedback");
    const footerLinks = {
        dictionary: [
            { href: "/word-list", label: t("links.wordList") },
            { href: "/announcements", label: t("links.announcements") },
            { href: "/offline-dictionary", label: t("links.offlineDictionary") },
        ],
        community: [
            { href: "/contribute-word", label: t("links.contributeWord") },
            { href: "/pronunciation-voting", label: t("links.pronunciations") },
            { href: "/feedback", label: t("links.seeFeedback") },
        ],
        legal: [
            { href: "/privacy-policy", label: t("links.privacy") },
            { href: "/terms-of-service", label: t("links.terms") },
        ]
    };

    return (
        <footer className="mt-auto bg-background-foreground/5 border-t border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left md:justify-items-center py-2">
                    {/* Dictionary Column */}
                    <div className="space-y-2">
                        <h3 className="text-md font-semibold text-text-foreground tracking-wider uppercase">{t("headings.dictionary")}</h3>
                        <ul className="space-y-1">
                            {footerLinks.dictionary.map(link => (
                                <li key={link.href}>
                                    <Link underline='hover' href={link.href} className="text-sm hover:text-primary text-gray-900 dark:hover:text-primary dark:text-gray-50 hover:underline rounded-sm">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Community Column */}
                    <div className="space-y-2">
                        <h3 className="text-md font-semibold text-text-foreground tracking-wider uppercase">{t("headings.community")}</h3>
                        <ul className="space-y-1">
                            {footerLinks.community.map(link => (
                                <li key={link.href}>
                                    <Link underline='hover' href={link.href} className="text-sm hover:text-primary text-gray-900 dark:hover:text-primary dark:text-gray-50 hover:underline rounded-sm">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <FeedbackModal session={session} variant="link">
                                    <span className="text-sm text-text-foreground/60 hover:text-text-foreground cursor-pointer">
                                        {tFeedback("submitFeedback")}
                                    </span>
                                </FeedbackModal>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div className="space-y-2">
                        <h3 className="text-md font-semibold text-text-foreground tracking-wider uppercase">{t("headings.legal")}</h3>
                        <ul className="space-y-1">
                            {footerLinks.legal.map(link => (
                                <li key={link.href}>
                                    <Link underline='hover' href={link.href} className="text-sm hover:text-primary text-gray-900 dark:hover:text-primary dark:text-gray-50 hover:underline rounded-sm">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Social Column - Optional */}
                    <div className="space-y-1">
                        <h3 className="text-md font-semibold text-text-foreground tracking-wider uppercase">{t("headings.social")}</h3>
                        <Link underline='hover' href="https://github.com/4furki4/Turkish-Dictionary" target="_blank" rel="noopener noreferrer" className="md:flex md:items-center gap-1 w-max hover:text-primary text-gray-900 dark:hover:text-primary dark:text-gray-50 hover:underline rounded-sm text-xs">
                            <Github size={14} />
                            <span>GitHub</span>
                        </Link>
                    </div>
                </div>

                <div className="border-t border-border py-2">
                    <p className="text-sm text-text-foreground/60 text-center">
                        {t("description")}
                    </p>
                    <p className="text-sm text-center text-text-foreground/50 mt-1">
                        © {new Date().getFullYear()} {t("licenseInfo")}
                    </p>
                </div>
            </div>
        </footer>
    )
}
