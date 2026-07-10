import packageJson from "@/package.json";
import { getBaseUrl } from "@/src/lib/seo-utils";
import { NextResponse } from "next/server";

const CACHE_CONTROL = "public, max-age=3600";

function createServerCard() {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/mcp`;

  return {
    serverInfo: {
      name: "Turkish Dictionary",
      version: packageJson.version,
    },
    transport: {
      type: "streamable-http",
      endpoint,
    },
    capabilities: {
      tools: false,
      resources: false,
      prompts: false,
    },
    name: "com.turkce-sozluk/dictionary",
    version: packageJson.version,
    description: "Public discovery metadata for the Turkish Dictionary service.",
    title: "Turkish Dictionary",
    websiteUrl: baseUrl,
    remotes: [
      {
        type: "streamable-http",
        url: endpoint,
      },
    ],
  };
}

function createServerCardHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": CACHE_CONTROL,
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function GET() {
  return new NextResponse(JSON.stringify(createServerCard()), {
    headers: createServerCardHeaders(),
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: createServerCardHeaders(),
  });
}
