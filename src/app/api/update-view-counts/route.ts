// src/app/api/cron/update-view-counts/route.ts
import { runUpdateViewCounts } from "@/src/lib/cron/update-view-counts";
import { NextResponse } from "next/server";
import { env } from "@/src/env.mjs";

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    console.warn("Unauthorized cron job access attempt.");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("Authorized cron job request received. Running update...");
    await runUpdateViewCounts();
    console.log("Cron job runUpdateViewCounts completed successfully.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cron job runUpdateViewCounts failed:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// Optional: Add configuration for edge runtime if preferred,
// but standard Node runtime is usually fine for cron jobs interacting with DB.
// export const runtime = 'edge'; // Example if edge runtime is needed
