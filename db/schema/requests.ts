import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp, } from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";
import { words } from "./words";
import { meanings } from "./meanings";
import { partOfSpeechs } from "./part_of_speechs";
import { roots } from "./roots";
import { authors } from "./authors";
import { examples } from "./examples";
import { contributionLogs } from "./contribution_logs";
import { request_votes } from "./request_votes";
import { pronunciations } from "./pronunciations";

export const actionsEnum = pgEnum("action", ["create", "update", "delete"]);

export const entityTypesEnum = pgEnum("entity_type", [
  "words",
  "meanings",
  "roots",
  "related_words",
  "part_of_speechs",
  "examples",
  "authors",
  "word_attributes",
  "meaning_attributes",
  "related_phrases",
  "pronunciations",
]);

export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);

export type Status = (typeof statusEnum.enumValues)[number];

export type EntityTypes = (typeof entityTypesEnum.enumValues)[number];

export type Actions = (typeof actionsEnum.enumValues)[number];

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  entityType: entityTypesEnum("entity_type").notNull(),
  entityId: integer("entity_id"),
  action: actionsEnum("action").notNull(),
  newData: jsonb("new_data"),
  requestDate: timestamp("request_date").defaultNow().notNull(),
  status: statusEnum("status").default("pending").notNull(),
  reason: text("reason"),
  // Resolution metadata (populated when approved/rejected)
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => users.id),
  moderationReason: text("moderation_reason"),
});

export const requestsRelations = relations(requests, ({ one, many }) => ({
  user: one(users, {
    fields: [requests.userId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [requests.resolvedBy],
    references: [users.id],
  }),
  word: one(words, {
    fields: [requests.entityId],
    references: [words.id],
  }),
  meaning: one(meanings, {
    fields: [requests.entityId, requests.entityType],
    references: [meanings.id, meanings.requestType],
  }),
  partOfSpeech: one(partOfSpeechs, {
    fields: [requests.entityId, requests.entityType],
    references: [partOfSpeechs.id, partOfSpeechs.requestType],
  }),
  root: one(roots, {
    fields: [requests.entityId, requests.entityType],
    references: [roots.id, roots.requestType],
  }),
  author: one(authors, {
    fields: [requests.entityId, requests.entityType],
    references: [authors.id, authors.requestType],
  }),
  example: one(examples, {
    fields: [requests.entityId, requests.entityType],
    references: [examples.id, examples.requestType],
  }),
  pronunciation: one(pronunciations, {
    fields: [requests.entityId],
    references: [pronunciations.wordId],
  }),
  contributionLogs: many(contributionLogs),
  votes: many(request_votes),
}));

export type SelectRequest = {
  id: number;
  userId: string;
  entityType: EntityTypes;
  entityId: number | null;
  action: Actions;
  newData: any;
  requestDate: Date;
  status: Status;
  reason: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  moderationReason: string | null;
};

export type InsertRequest = {
  userId: string;
  entityType: EntityTypes;
  entityId: number;
  action: Actions;
  newData: any;
  requestDate: Date;
  status: Status;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  moderationReason?: string | null;
};
