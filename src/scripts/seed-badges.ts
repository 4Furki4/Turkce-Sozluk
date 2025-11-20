import { db } from "@/db";
import { badges } from "@/db/schema/gamification";

const initialBadges = [
    {
        slug: "cirak",
        nameTr: "Çırak",
        nameEn: "Apprentice",
        descriptionTr: "Sözlüğe katkı yapmaya başladın. (10 Puan)",
        descriptionEn: "You started contributing to the dictionary. (10 Points)",
        icon: "🌱",
        requirementType: "min_points" as const,
        requirementValue: 10,
        category: "general" as const,
    },
    {
        slug: "kalfa",
        nameTr: "Kalfa",
        nameEn: "Journeyman",
        descriptionTr: "Sözlüğün güvenilir bir üyesisin. (100 Puan)",
        descriptionEn: "You are a trusted member of the dictionary. (100 Points)",
        icon: "🔨",
        requirementType: "min_points" as const,
        requirementValue: 100,
        category: "general" as const,
    },
    {
        slug: "ustat",
        nameTr: "Üstat",
        nameEn: "Master",
        descriptionTr: "Sözlükte bir otoritesin. (1000 Puan)",
        descriptionEn: "You are an authority in the dictionary. (1000 Points)",
        icon: "👑",
        requirementType: "min_points" as const,
        requirementValue: 1000,
        category: "general" as const,
    },
    {
        slug: "bulbul",
        nameTr: "Bülbül",
        nameEn: "Nightingale",
        descriptionTr: "10 kelimenin telaffuzunu ekledin.",
        descriptionEn: "You added pronunciations for 10 words.",
        icon: "🎙️",
        requirementType: "count_pronunciation" as const,
        requirementValue: 10,
        category: "specialist" as const,
    },
    {
        slug: "kasif",
        nameTr: "Kaşif",
        nameEn: "Explorer",
        descriptionTr: "5 yeni kelime keşfettin ve ekledin.",
        descriptionEn: "You discovered and added 5 new words.",
        icon: "🧭",
        requirementType: "count_word" as const,
        requirementValue: 5,
        category: "specialist" as const,
    },
];

async function seedBadges() {
    console.log("🌱 Seeding badges...");

    for (const badge of initialBadges) {
        await db
            .insert(badges)
            .values(badge)
            .onConflictDoUpdate({
                target: badges.slug,
                set: badge,
            });
    }

    console.log("✅ Badges seeded successfully!");
    process.exit(0);
}

seedBadges().catch((err) => {
    console.error("❌ Error seeding badges:", err);
    process.exit(1);
});
