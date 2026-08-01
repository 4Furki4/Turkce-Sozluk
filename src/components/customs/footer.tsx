import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link as NextIntlLink } from "@/src/i18n/routing";
import { Github } from 'lucide-react';
import Image from "next/image";
import logo from "@/public/svg/navbar/logo.svg";
import { io } from "next/cache";

async function CurrentYear() {
    await io();
    return new Date().getFullYear();
}

function FooterLink({
    href,
    children,
}: {
    href:
        | "/word-list"
        | "/words"
        | "/announcements"
        | "/offline-dictionary"
        | "/play"
        | "/leaderboards"
        | "/contribute-word"
        | "/donate"
        | "/pronunciation-voting"
        | "/feedback"
        | "/foreign-term-suggestions"
        | "/privacy-policy"
        | "/terms-of-service";
    children: React.ReactNode;
}) {
    const className =
        "text-sm text-muted-foreground hover:text-primary transition-colors";

    return (
        <Suspense
            fallback={<span className={className}>{children}</span>}
        >
            <NextIntlLink href={href} className={className}>
                {children}
            </NextIntlLink>
        </Suspense>
    );
}

export default async function Footer({
    locale,
    feedbackAction,
}: {
    locale: string;
    feedbackAction: React.ReactNode;
}) {
    const [t, tNavbar] = await Promise.all([
        getTranslations({ locale, namespace: "Footer" }),
        getTranslations({ locale, namespace: "Navbar" }),
    ]);

    const footerLinks = {
        dictionary: [
            { href: "/word-list" as const, label: t("links.wordList") },
            { href: "/words" as const, label: t("links.wordIndex") },
            { href: "/announcements" as const, label: t("links.announcements") },
            { href: "/offline-dictionary" as const, label: t("links.offlineDictionary") },
        ],
        games: [
            { href: "/play" as const, label: t("links.play") },
            { href: "/leaderboards" as const, label: t("links.leaderboards") },
        ],
        community: [
            { href: "/contribute-word" as const, label: t("links.contributeWord") },
            { href: "/donate" as const, label: t("links.donate") },
            { href: "/pronunciation-voting" as const, label: t("links.pronunciations") },
            { href: "/feedback" as const, label: t("links.seeFeedback") },
            { href: "/foreign-term-suggestions" as const, label: t("links.foreignTermSuggestions") },
        ],
        legal: [
            { href: "/privacy-policy" as const, label: t("links.privacy") },
            { href: "/terms-of-service" as const, label: t("links.terms") },
        ],
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
                                        <FooterLink href={link.href}>
                                            {link.label}
                                        </FooterLink>
                                    </li>
                                ))}
                                <li>
                                    <a
                                        href="https://durum.turkce-sozluk.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        {t("links.status")}
                                    </a>
                                </li>
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
                                        <FooterLink href={link.href}>
                                            {link.label}
                                        </FooterLink>
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
                                        <FooterLink href={link.href}>
                                            {link.label}
                                        </FooterLink>
                                    </li>
                                ))}
                                <li>
                                    {feedbackAction}
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
                                        <FooterLink href={link.href}>
                                            {link.label}
                                        </FooterLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground text-center md:text-left">
                        © <Suspense fallback={null}><CurrentYear /></Suspense> {t("licenseInfo")}
                    </p>
                </div>
            </div>
        </footer>
    )
}

