CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"at_uri" text NOT NULL,
	"subject_uri" text NOT NULL,
	"subject_cid" text NOT NULL,
	"author_did" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "reactions" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "reactions" jsonb DEFAULT '{}'::jsonb;