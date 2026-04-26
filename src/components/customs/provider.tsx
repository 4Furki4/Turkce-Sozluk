"use client";
import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { type ThemeProviderProps } from 'next-themes'
import { ThemeProvider } from "next-themes";
import { useLocale } from "next-intl";
export default function Providers({ children, ...props }: ThemeProviderProps) {
  const locale = useLocale();
  return (
    <HeroUIProvider className="min-h-[100dvh] relative flex flex-col place-items-stretch overflow-y-hidden" skipFramerMotionAnimations locale={locale === 'tr' ? 'tr-TR' : 'en-US'} reducedMotion="user">
      <ThemeProvider
        {...props}
        attribute="class"
        defaultTheme="dark"
        enableSystem
        themes={["dark", "light", "system"]}
      >
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  );
}
