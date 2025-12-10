UPDATE "accounts" SET "id" = "provider" || '_' || "providerAccountId" WHERE "id" IS NULL;
UPDATE "accounts" SET "access_token_expires_at" = to_timestamp("expires_at") WHERE "expires_at" IS NOT NULL;
UPDATE "accounts" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "accounts" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;

UPDATE "session" SET "id" = "sessionToken" WHERE "id" IS NULL;
UPDATE "session" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "session" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;

UPDATE "users" SET "email_verified" = false WHERE "email_verified" IS NULL;
UPDATE "users" SET "created_at" = CURRENT_TIMESTAMP WHERE "created_at" IS NULL;
UPDATE "users" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;
ALTER TABLE "verification_token" RENAME TO "verification";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "provider" TO "providerId";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "access_token" TO "accessToken";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "refresh_token" TO "refreshToken";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "expires_at" TO "accessTokenExpiresAt";--> statement-breakpoint
ALTER TABLE "accounts" RENAME COLUMN "id_token" TO "idToken";--> statement-breakpoint
ALTER TABLE "session" RENAME COLUMN "sessionToken" TO "token";--> statement-breakpoint
ALTER TABLE "session" RENAME COLUMN "expires" TO "expiresAt";--> statement-breakpoint
ALTER TABLE "verification" RENAME COLUMN "expires" TO "expiresAt";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_provider_providerAccountId_pk";--> statement-breakpoint
ALTER TABLE "verification" DROP CONSTRAINT "verification_token_identifier_token_pk";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "accountId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "refreshTokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "ipAddress" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "userAgent" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "value" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "createdAt" timestamp;--> statement-breakpoint
ALTER TABLE "verification" ADD COLUMN "updatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "providerAccountId";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "token_type";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "session_state";--> statement-breakpoint
ALTER TABLE "verification" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_token_unique" UNIQUE("token");