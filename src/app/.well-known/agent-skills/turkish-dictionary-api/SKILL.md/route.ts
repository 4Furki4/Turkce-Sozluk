import { TURKISH_DICTIONARY_API_SKILL } from "@/src/lib/agent-skills";
import { NextResponse } from "next/server";

const CACHE_CONTROL = "public, max-age=3600";

function createHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "text/markdown; charset=utf-8",
  };
}

export function GET() {
  return new NextResponse(TURKISH_DICTIONARY_API_SKILL, { headers: createHeaders() });
}

export function HEAD() {
  return new NextResponse(null, { headers: createHeaders() });
}
