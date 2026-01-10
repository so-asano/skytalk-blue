CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name_ja" text NOT NULL,
	"name_en" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "comment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo" text NOT NULL,
	"at_uri" text NOT NULL,
	"cid" text,
	"thread_uri" text,
	"text_content" text,
	"action" text NOT NULL,
	"cursor" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"at_uri" text NOT NULL,
	"author_did" text NOT NULL,
	"author_handle" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jetstream_cursors" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"cursor" bigint NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo" text NOT NULL,
	"at_uri" text NOT NULL,
	"cid" text,
	"channel_id" text,
	"title" text,
	"text_content" text,
	"action" text NOT NULL,
	"cursor" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"title" text NOT NULL,
	"text" text,
	"author_did" text NOT NULL,
	"author_handle" text NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;