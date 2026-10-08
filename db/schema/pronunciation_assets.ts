import { integer, jsonb, pgTable, real, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { words } from "./words";

// Content-addressed media is shared; the entry association always uses the word ID.
export const pronunciationAssets = pgTable("pronunciation_assets", {
  key: varchar("key", { length: 64 }).primaryKey(),
  spokenText: text("spoken_text").notNull(),
  model: text("model").notNull(),
  modelRevision: text("model_revision").notNull(),
  packageVersion: text("package_version").notNull(),
  settings: jsonb("settings").$type<{ seed: number; speed: number; device: string; sampleRate: number; pipeline: number }>().notNull(),
  objectKey: text("object_key").notNull(),
  audioUrl: text("audio_url").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  duration: real("duration").notNull(),
  rms: real("rms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wordPronunciationAudio = pgTable("word_pronunciation_audio", {
  wordId: integer("word_id").primaryKey().references(() => words.id, { onDelete: "cascade" }),
  assetKey: varchar("asset_key", { length: 64 }).notNull().references(() => pronunciationAssets.key),
  headword: text("headword").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
