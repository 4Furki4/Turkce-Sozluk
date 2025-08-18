ALTER TABLE "requests" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "resolved_by" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "moderation_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;