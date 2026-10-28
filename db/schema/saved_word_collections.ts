import { type InferSelectModel } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { savedWords } from "./saved_words";

export const savedWordCollections = pgTable(
  "saved_word_collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    // The composite key also makes ownership a database invariant for membership.
    unique("saved_word_collections_id_user_unique").on(table.id, table.userId),
    unique("saved_word_collections_user_name_unique").on(table.userId, table.name),
  ],
);

export const savedWordCollectionMembers = pgTable(
  "saved_word_collection_members",
  {
    collectionId: uuid("collection_id").notNull(),
    userId: text("user_id").notNull(),
    wordId: integer("word_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.collectionId, table.wordId] }),
    foreignKey({
      name: "saved_word_collection_members_owned_collection_fk",
      columns: [table.collectionId, table.userId],
      foreignColumns: [savedWordCollections.id, savedWordCollections.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "saved_word_collection_members_saved_word_fk",
      columns: [table.userId, table.wordId],
      foreignColumns: [savedWords.userId, savedWords.wordId],
    }).onDelete("cascade"),
    index("saved_word_collection_members_user_word_idx").on(table.userId, table.wordId),
    index("saved_word_collection_members_collection_idx").on(table.collectionId, table.userId),
  ],
);

export type SelectSavedWordCollection = InferSelectModel<typeof savedWordCollections>;
