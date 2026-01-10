CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"did" text NOT NULL,
	"at_uri" text NOT NULL,
	"marked_as_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
