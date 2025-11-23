"use client";

import { useTranslations } from "next-intl";

export function RateLimitToast() {
    const t = useTranslations("Errors");
    return <span>{t("TooManyRequests")}</span>;
}
