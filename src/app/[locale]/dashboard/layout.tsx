import Dashboard from "@/src/_pages/dashboard/dashboard";
import DashboardUnauthorizedMessage from "@/src/_pages/dashboard/dashboard-unauthorized-login";
import { auth } from "@/src/lib/auth";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import React, { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "CRUD operations for the Turkish Dictionary",
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

  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session) redirect("/signin", RedirectType.replace);
  if (!["admin", "moderator"].includes(session?.user.role!)) {
    return <DashboardUnauthorizedMessage />;
  }
  return (
    <Dashboard locale={params.locale}>
      {children}
    </Dashboard>
  )
}
