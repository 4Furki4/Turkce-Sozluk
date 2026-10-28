CREATE TABLE "saved_word_collection_members" (
	"collection_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"word_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_word_collection_members_user_id_collection_id_word_id_pk" PRIMARY KEY("user_id","collection_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "saved_word_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_word_collections_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "saved_word_collections_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "saved_word_collection_members" ADD CONSTRAINT "saved_word_collection_members_owned_collection_fk" FOREIGN KEY ("collection_id","user_id") REFERENCES "public"."saved_word_collections"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_word_collection_members" ADD CONSTRAINT "saved_word_collection_members_saved_word_fk" FOREIGN KEY ("user_id","word_id") REFERENCES "public"."saved_words"("user_id","word_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_word_collections" ADD CONSTRAINT "saved_word_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_word_collection_members_user_word_idx" ON "saved_word_collection_members" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE INDEX "saved_word_collection_members_collection_idx" ON "saved_word_collection_members" USING btree ("collection_id","user_id");