-- Drop foreign key constraints first
ALTER TABLE "comments" DROP CONSTRAINT "comments_thread_id_threads_id_fk";--> statement-breakpoint

-- Change column types
ALTER TABLE "comments" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "thread_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "at_uri" text NOT NULL;--> statement-breakpoint

-- Re-add foreign key constraint
ALTER TABLE "comments" ADD CONSTRAINT "comments_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;
