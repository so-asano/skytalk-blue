ALTER TABLE "comments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "author_handle";--> statement-breakpoint
ALTER TABLE "threads" DROP COLUMN "author_handle";