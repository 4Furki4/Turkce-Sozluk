import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health check failure";

    return NextResponse.json(
      {
        status: "error",
        checks: {
          app: "ok",
          database: "error",
        },
        error: message,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
