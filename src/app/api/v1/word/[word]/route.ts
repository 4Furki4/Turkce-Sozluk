import { type NextRequest, NextResponse } from "next/server";

import { words } from "@/db/schema/words";
import { ilike } from "drizzle-orm";
import { env } from "@/src/env.mjs";
import { db } from "@/db";

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        },
    });
}

// Next.js 15: Params is a Promise
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ word: string }> }
) {
    // 1. Await params (Next 15 requirement)
    const { word } = await params;

    // 2. Security Check
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== env.INTERNAL_API_KEY) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. DB Query
    const wordData = await db.query.words.findFirst({
        where: ilike(words.name, decodeURIComponent(word)),
        with: {
            meanings: true,
        },
    });

    if (!wordData) {
        return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    // 4. Return with CORS headers
    return NextResponse.json(wordData, {
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    });
}
