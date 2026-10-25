import Dashboard from "@/src/_pages/dashboard/dashboard";
import DashboardUnauthorizedMessage from "@/src/_pages/dashboard/dashboard-unauthorized-login";
import { auth } from "@/src/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect, getPathname } from "@/src/i18n/routing";
import React, { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "CRUD operations for the Turkish Dictionary",
  robots: { index: false, follow: false },
}


export default async function DashboardLayout(
  props: {
    children?: ReactNode;
    params: Promise<{
      locale: string
    }>
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders
  });
  if (!session) return redirect({
    locale: params.locale as "en" | "tr",
    href: { pathname: "/signin", query: { backTo: requestHeaders.get("x-current-url") ?? getPathname({ locale: params.locale, href: "/dashboard" }) } },
  });
  if (!["admin", "moderator"].includes(session.user.role ?? "")) {
    return <DashboardUnauthorizedMessage />;
  }
  return (
    <Dashboard locale={params.locale} showAdminTools={session.user.role === "admin"}>
      {children}
    </Dashboard>
  )
}
