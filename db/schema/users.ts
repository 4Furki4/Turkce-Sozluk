import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { words } from "./words";
import { pronunciations } from "./pronunciations";
import { savedWords } from "./saved_words";
import { requests } from "./requests";
import { contributionLogs } from "./contribution_logs";
import { usersToBadges } from "./gamification";

export const rolesEnum = pgEnum("role", ["user", "moderator", "admin"]);

export type Role = (typeof rolesEnum.enumValues)[number];

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  username: varchar("username", { length: 255 }),
  role: rolesEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  points: integer("points").default(0).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  saved_words: many(savedWords),
  pronounciations: many(pronunciations),
  requests: many(requests, {
    relationName: "requestUser"
  }),
  resolvedRequests: many(requests, {
    relationName: "requestResolver"
  }),
  contributionLogs: many(contributionLogs),
  badges: many(usersToBadges),
}));

export const usersToWordsRelations = relations(savedWords, ({ one }) => ({
  user: one(users, {
    fields: [savedWords.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [savedWords.wordId],
    references: [words.id],
  }),
}));

export type SelectUser = InferSelectModel<typeof users>;
export type SelectUsersToWords = InferSelectModel<typeof savedWords>;
export type InsertUser = InferInsertModel<typeof users>;
export type InsertUsersToWords = InferInsertModel<typeof savedWords>;
