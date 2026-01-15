ALTER TABLE "comments" ADD COLUMN "blobs" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "blobs" jsonb DEFAULT '[]'::jsonb;