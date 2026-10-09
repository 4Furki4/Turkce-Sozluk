"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/src/hooks/use-progress-router";

export const RATE_LIMIT_TOAST_ID = "rate-limit";

function useRetryCountdown(retryAt: number) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(timer);
    }, [retryAt]);
    return Math.max(0, Math.ceil((retryAt - now) / 1000));
}

export function RateLimitToast({ retryAt }: { retryAt: number }) {
    const t = useTranslations("Errors");
    const seconds = useRetryCountdown(retryAt);
    return (
        <div className="flex flex-col gap-1">
            <span>{t("TooManyRequests")}</span>
            <span aria-live="off">{seconds > 0 ? t("RateLimitCountdown", { seconds }) : t("RateLimitReady")}</span>
        </div>
    );
}

export function RateLimitRetry({ retry, retryAt = 0 }: { retry: () => void; retryAt?: number }) {
    const t = useTranslations("Errors");
    const seconds = useRetryCountdown(retryAt);
    return (
        <button type="button" disabled={seconds > 0}
            className="shrink-0 whitespace-nowrap rounded-md border border-border bg-background/40 px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-50"
            onClick={() => {
                if (Date.now() < retryAt) return;
                toast.dismiss(RATE_LIMIT_TOAST_ID);
                retry();
            }}>
            {t("Retry")}
        </button>
    );
}

export function showRateLimitToast({ retry, retryAt = Date.now() + 10_000 }: { retry?: () => void; retryAt?: number } = {}) {
    // This Sonner version treats a JSX title as the entire toast, omitting its action.
    toast.error(() => <RateLimitToast retryAt={retryAt} />, {
        id: RATE_LIMIT_TOAST_ID,
        duration: Math.max(6000, retryAt - Date.now() + 6000),
        action: retry ? <RateLimitRetry retry={retry} retryAt={retryAt} /> : undefined,
    });
}

/** Server components can render this signal without serializing an Error to the browser. */
export function RateLimitNotification({ retryAt }: { retryAt: number }) {
    const router = useProgressRouter();
    useEffect(() => { showRateLimitToast({ retryAt, retry: () => router.refresh() }); }, [router, retryAt]);
    return null;
}
