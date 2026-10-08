CREATE TABLE "pronunciation_assets" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"spoken_text" text NOT NULL,
	"model" text NOT NULL,
	"model_revision" text NOT NULL,
	"package_version" text NOT NULL,
	"settings" jsonb NOT NULL,
	"object_key" text NOT NULL,
	"audio_url" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"duration" real NOT NULL,
	"rms" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_pronunciation_audio" (
	"word_id" integer PRIMARY KEY NOT NULL,
	"asset_key" varchar(64) NOT NULL,
	"headword" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_pronunciation_audio" ADD CONSTRAINT "word_pronunciation_audio_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_pronunciation_audio" ADD CONSTRAINT "word_pronunciation_audio_asset_key_pronunciation_assets_key_fk" FOREIGN KEY ("asset_key") REFERENCES "public"."pronunciation_assets"("key") ON DELETE no action ON UPDATE no action;