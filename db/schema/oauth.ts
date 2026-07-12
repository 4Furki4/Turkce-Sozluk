import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const oauthApplications = pgTable(
  "oauth_application",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientId: text("client_id").notNull().unique(),
    clientSecret: text("client_secret"),
    type: text("type").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    metadata: text("metadata"),
    redirectUrls: text("redirect_urls").notNull(),
    disabled: boolean("disabled").notNull().default(false),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("oauth_application_user_id_idx").on(table.userId)],
);

export const oauthAccessTokens = pgTable(
  "oauth_access_token",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accessToken: text("access_token").notNull().unique(),
    refreshToken: text("refresh_token").notNull().unique(),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }).notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }).notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthApplications.clientId, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    scopes: text("scopes").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("oauth_access_token_client_id_idx").on(table.clientId),
    index("oauth_access_token_user_id_idx").on(table.userId),
  ],
);

export const oauthConsents = pgTable(
  "oauth_consent",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthApplications.clientId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopes: text("scopes").notNull(),
    consentGiven: boolean("consent_given").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("oauth_consent_client_id_idx").on(table.clientId),
    index("oauth_consent_user_id_idx").on(table.userId),
  ],
);

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  alg: text("alg"),
  crv: text("crv"),
});
