import { createTrpcOAuthProtectedResourceMetadata } from "@/src/lib/oidc-metadata";
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

function isTrpcResource(resource: string[]) {
  return resource.length === 2 && resource[0] === "api" && resource[1] === "trpc";
}

async function getResource(params: Promise<{ resource: string[] }>) {
  return (await params).resource;
}

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string[] }> }) {
  if (!isTrpcResource(await getResource(params))) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(createTrpcOAuthProtectedResourceMetadata(), {
    headers: createHeaders(),
  });
}

export async function HEAD(_request: Request, { params }: { params: Promise<{ resource: string[] }> }) {
  if (!isTrpcResource(await getResource(params))) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { headers: createHeaders() });
}
