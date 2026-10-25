"use client";
import React, { Suspense } from "react";
import { TaskSourceRestoration } from "@/src/components/task-pages/task-source-restoration";
import { HeroUIProvider } from "@heroui/react";
import { type ThemeProviderProps } from 'next-themes'
import { ThemeProvider } from "next-themes";
import { useLocale } from "next-intl";
import { useWordQueryLatencyRoute } from "@/src/hooks/use-word-query-latency-route";
import { useSearchOutcomeReporting } from "@/src/hooks/use-search-outcome";
export default function Providers({ children, ...props }: ThemeProviderProps) {
  const locale = useLocale();
  useWordQueryLatencyRoute();
  useSearchOutcomeReporting();
  return (
    <HeroUIProvider className="min-h-[100dvh] relative flex flex-col place-items-stretch overflow-y-hidden" skipFramerMotionAnimations locale={locale === 'tr' ? 'tr-TR' : 'en-US'} reducedMotion="user">
      <ThemeProvider
        {...props}
        attribute="class"
        defaultTheme="system"
        enableSystem
        themes={["dark", "light", "system"]}
      >
        <Suspense><TaskSourceRestoration /></Suspense>
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  );
}
