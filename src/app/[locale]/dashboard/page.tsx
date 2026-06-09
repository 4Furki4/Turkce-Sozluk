import { DashboardOverview } from "@/src/_pages/dashboard/overview/dashboard-overview";
import { api, HydrateClient } from "@/src/trpc/server";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard overview",
  robots: {
    follow: false,
    index: false,
    googleBot: {
      follow: false,
      index: false,
    },
  },
};

export default async function DashboardPage() {
  void api.admin.overview.getDashboardOverview.prefetch();

  return (
    <HydrateClient>
      <DashboardOverview />
    </HydrateClient>
  );
}
