import { db } from "@/db";
import { meanings } from "@/db/schema/meanings";
import { words } from "@/db/schema/words";
import { eq } from "drizzle-orm";
import { Meilisearch } from "meilisearch";

const client = new Meilisearch({
    host: process.env.MEILI_HOST || "http://192.168.1.2:7700",
    apiKey: process.env.MEILI_MASTER_KEY!,
});

async function sync() {
    console.log("🚀 Starting Meilisearch sync...");

    // 1. Fetch data from PostgreSQL
    // We join with the 'words' table so the search result can show the word name
    const allMeanings = await db
        .select({
            id: meanings.id,
            meaning: meanings.meaning,
            wordName: words.name,
            wordId: words.id,
        })
        .from(meanings)
        .innerJoin(words, eq(meanings.wordId, words.id));

    console.log(`📦 Fetched ${allMeanings.length} meanings.`);

    // 2. Prepare the index
    const index = client.index("meanings");

    // 3. Configure for Turkish Relevancy
    // Adding 'wordName' to searchable attributes ensures both the word and its meaning are searchable
    await index.updateSettings({
        searchableAttributes: ["meaning", "wordName"],
        filterableAttributes: ["wordId"],
        // Meilisearch automatically handles Turkish tokenization for whitespace-separated words
    });

    // 4. Add documents in chunks to avoid overwhelming your Pi's RAM
    const CHUNK_SIZE = 10000;
    for (let i = 0; i < allMeanings.length; i += CHUNK_SIZE) {
        const chunk = allMeanings.slice(i, i + CHUNK_SIZE);
        await index.addDocuments(chunk, { primaryKey: "id" });
        console.log(`✅ Indexed chunk ${i / CHUNK_SIZE + 1}`);
    }

    console.log("🎉 Sync complete!");
}

sync().catch(console.error);