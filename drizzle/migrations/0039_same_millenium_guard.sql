ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "emailVerifiedTimestamp";--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonatedBy" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_impersonatedBy_users_id_fk" FOREIGN KEY ("impersonatedBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;