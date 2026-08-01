import { setRequestLocale } from "next-intl/server";
import { Params } from "next/dist/server/request/params";
import React from "react";

export const instant = false;

export default async function SearchLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<Params>
}) {
  const { locale } = await params
  setRequestLocale(locale as string)
  return (
    <div className="w-full">
      {children}
    </div>
  );
}
