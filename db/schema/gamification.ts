import { relations } from "drizzle-orm";
import {
    integer,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const badgeRequirementTypeEnum = pgEnum("badge_requirement_type", [
    "min_points",
    "count_word",
    "count_pronunciation",
    "count_meaning",
]);

export const badgeCategoryEnum = pgEnum("badge_category", [
    "general",
    "specialist",
]);

export const badges = pgTable("badges", {
    slug: text("slug").primaryKey(),
    nameTr: text("name_tr").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionTr: text("description_tr").notNull(),
    descriptionEn: text("description_en").notNull(),
    icon: text("icon").notNull(), // Lucide icon name or emoji
    requirementType: badgeRequirementTypeEnum("requirement_type").notNull(),
    requirementValue: integer("requirement_value").notNull(),
    category: badgeCategoryEnum("category").default("general").notNull(),
});

export const usersToBadges = pgTable(
    "users_to_badges",
    {
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        badgeSlug: text("badge_slug")
            .notNull()
            .references(() => badges.slug, { onDelete: "cascade" }),
        awardedAt: timestamp("awarded_at").defaultNow().notNull(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.userId, t.badgeSlug] }),
    })
);

export const badgesRelations = relations(badges, ({ many }) => ({
    users: many(usersToBadges),
}));

export const usersToBadgesRelations = relations(usersToBadges, ({ one }) => ({
    user: one(users, {
        fields: [usersToBadges.userId],
        references: [users.id],
    }),
    badge: one(badges, {
        fields: [usersToBadges.badgeSlug],
        references: [badges.slug],
    }),
}));
