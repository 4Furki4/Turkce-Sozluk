"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileGuard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (status === "loading") return;

        if (session?.user) {
            const isProfileIncomplete = !session.user.name;
            const isOnCompleteProfilePage = pathname?.includes("/complete-profile") || pathname?.includes("/profil-tamamla");
            const isApiRoute = pathname?.startsWith("/api");
            const isSignOut = pathname?.includes("/signout");

            if (isProfileIncomplete && !isOnCompleteProfilePage && !isApiRoute && !isSignOut) {
                // Redirect to complete profile page
                // We need to handle locale here, but for now let's assume the middleware or the page itself handles the locale prefix if we push to a relative path?
                // Actually, since we are in a client component, we should probably try to respect the current locale or just redirect to a locale-agnostic path if possible, 
                // but Next.js app router usually requires locale.
                // Let's try to detect locale from pathname or session if possible, or just default to 'tr' or 'en' based on pathname.

                const locale = pathname?.split('/')[1] || 'tr';
                // Check if locale is valid (en or tr), otherwise default to tr
                const validLocale = ['en', 'tr'].includes(locale) ? locale : 'tr';

                const targetPath = validLocale === 'en' ? '/en/complete-profile' : '/tr/profil-tamamla';

                router.push(targetPath);
            }
        }
    }, [session, status, pathname, router]);

    return null;
}
