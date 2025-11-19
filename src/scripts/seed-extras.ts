import 'dotenv/config';
import { db } from '@/db';
import { words } from '@/db/schema/words';
import { misspellings } from '@/db/schema/misspellings';
import { galatiMeshur } from '@/db/schema/galatimeshur';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🌱 Seeding extra sections...');

    // --- 1. Seed Common Misspellings ---
    const spellingMap = [
        { correct: "herkes", wrong: "herkez" },
        { correct: "şoför", wrong: "şöför" },
        { correct: "yalnız", wrong: "yanlız" },
        { correct: "yanlış", wrong: "yalnış" },
        { correct: "egzoz", wrong: "egzos" },
    ];

    for (const item of spellingMap) {
        const wordEntry = await db.query.words.findFirst({
            where: eq(words.name, item.correct)
        });

        if (wordEntry) {
            await db.insert(misspellings).values({
                correctWordId: wordEntry.id,
                incorrectSpelling: item.wrong,
                frequency: Math.floor(Math.random() * 100) + 10 // Random popularity
            }).onConflictDoNothing();
            console.log(`Added misspelling: ${item.wrong} -> ${item.correct}`);
        }
    }

    // --- 2. Seed Galat-ı Meşhur ---
    // Example: "Zürafa" is actually plural in Arabic (Zuraflar), but we use it as singular.
    const galatList = [
        {
            word: "zürafa",
            explanation: "Arapça 'zurafa' kelimesinin çoğuludur, yani 'zarifler' demektir. Ancak Türkçede tekil bir hayvan ismi olarak yerleşmiştir."
        },
        {
            word: "evrak",
            explanation: "Arapça 'varak' (kağıt/belge) kelimesinin çoğuludur. 'Evraklar' dediğimizde aslında 'belgelerler' demiş oluruz ama kullanımı kabul görmüştür."
        }
    ];

    for (const item of galatList) {
        const wordEntry = await db.query.words.findFirst({
            where: eq(words.name, item.word)
        });

        if (wordEntry) {
            await db.insert(galatiMeshur).values({
                wordId: wordEntry.id,
                explanation: item.explanation,
            }).onConflictDoNothing();
            console.log(`Added Galat-ı Meşhur: ${item.word}`);
        }
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
}

main().catch(console.error);