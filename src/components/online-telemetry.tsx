"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { useOnlineStatus } from "@/src/hooks/use-online-status";

export default function OnlineTelemetry() {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return null;
  }

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
