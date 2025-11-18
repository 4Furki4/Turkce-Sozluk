// src/app/api/cron/generate-daily-word/route.ts
import { db } from "@/db";
import { words } from "@/db/schema/words";
import { meanings } from "@/db/schema/meanings";
import { sql, eq, exists } from "drizzle-orm";
import { NextResponse } from "next/server";
import { dailyWords } from "@/db/schema/daily-words";

export const dynamic = 'force-dynamic'; // Important for Cron routes

export async function GET(request: Request) {
    // Security: Verify the call is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Check if we already have a word for today
    const existing = await db.query.dailyWords.findFirst({
        where: eq(dailyWords.date, today),
    });

    if (existing) {
        return NextResponse.json({ message: "Word already exists for today", wordId: existing.wordId });
    }

    // 2. Pick a random word
    // QUALITY CONTROL: Only pick words that actually have a meaning!
    // We use a subquery to ensure the word has at least one entry in the 'meanings' table.
    const randomWord = await db
        .select({ id: words.id })
        .from(words)
        .where(exists(
            db.select()
                .from(meanings)
                .where(eq(meanings.wordId, words.id))
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);

    if (!randomWord.length) {
        return NextResponse.json({ error: "No valid words found" }, { status: 500 });
    }

    const wordId = randomWord[0].id;

    // 3. Save it to the daily_words table
    await db.insert(dailyWords).values({
        wordId,
        date: today,
    });

    return NextResponse.json({ success: true, date: today, wordId });
}