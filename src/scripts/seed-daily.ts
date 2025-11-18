// src/scripts/seed-daily.ts
import 'dotenv/config';
import { db } from '@/db';
import { dailyWords } from '@/db/schema/daily-words';
import { words } from '@/db/schema/words';
import { meanings } from '@/db/schema/meanings';
import { eq, sql } from 'drizzle-orm';

async function main() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🌱 Seeding daily word for ${today}...`);

    // 1. Check if a word already exists for today
    const existing = await db.query.dailyWords.findFirst({
        where: eq(dailyWords.date, today),
        with: {
            word: true
        }
    });

    if (existing) {
        console.log(`✅ Daily word already exists: "${existing.word.name}"`);
        process.exit(0);
    }

    // 2. Pick a random word that acts as a valid "Word of the Day"
    // It must have at least one meaning to be interesting.
    const randomWord = await db
        .select({ id: words.id, name: words.name })
        .from(words)
        .innerJoin(meanings, eq(words.id, meanings.wordId)) // Only words with meanings
        .orderBy(sql`RANDOM()`) // Postgres random sort
        .limit(1);

    if (randomWord.length === 0) {
        console.error("❌ No suitable words found in the database. Have you run 'bun run seed:tdk'?");
        process.exit(1);
    }

    const selected = randomWord[0];

    // 3. Insert into daily_words
    await db.insert(dailyWords).values({
        wordId: selected.id,
        date: today
    });

    console.log(`🎉 Successfully seeded daily word: "${selected.name}"`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Failed to seed daily word:", err);
    process.exit(1);
});