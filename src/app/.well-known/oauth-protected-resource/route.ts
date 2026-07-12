import { createOAuthProtectedResourceMetadata } from "@/src/lib/oidc-metadata";
import { NextResponse } from "next/server";

const CACHE_CONTROL = "public, max-age=3600";

function createHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function GET() {
  return NextResponse.json(createOAuthProtectedResourceMetadata(), { headers: createHeaders() });
}

export function HEAD() {
  return new NextResponse(null, { headers: createHeaders() });
}
