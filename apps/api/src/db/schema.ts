import { pgTable, text, timestamp, integer, bigint, serial } from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: text("id").primaryKey(),
  nameJa: text("name_ja").notNull(),
  nameEn: text("name_en").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const threads = pgTable("threads", {
  id: text("id").primaryKey(), // TID
  atUri: text("at_uri").notNull(),
  channelId: text("channel_id")
    .references(() => channels.id)
    .notNull(),
  title: text("title").notNull(),
  text: text("text"),
  authorDid: text("author_did").notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const comments = pgTable("comments", {
  id: text("id").primaryKey(), // TID
  threadId: text("thread_id")
    .references(() => threads.id)
    .notNull(),
  atUri: text("at_uri").notNull(),
  authorDid: text("author_did").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Jetstream cursor for resuming subscription
export const jetstreamCursors = pgTable("jetstream_cursors", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  cursor: bigint("cursor", { mode: "bigint" }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Thread events history from Jetstream
export const threadEvents = pgTable("thread_events", {
  id: serial("id").primaryKey(),
  repo: text("repo").notNull(),
  atUri: text("at_uri").notNull(),
  cid: text("cid"),
  channelId: text("channel_id"),
  title: text("title"),
  textContent: text("text_content"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  cursor: bigint("cursor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comment events history from Jetstream
export const commentEvents = pgTable("comment_events", {
  id: serial("id").primaryKey(),
  repo: text("repo").notNull(),
  atUri: text("at_uri").notNull(),
  cid: text("cid"),
  threadUri: text("thread_uri"),
  textContent: text("text_content"),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE
  cursor: bigint("cursor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications for mentions
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  did: text("did").notNull(), // Recipient DID
  atUri: text("at_uri").notNull(), // Thread or comment AT URI
  markedAsReadAt: timestamp("marked_as_read_at"), // null = unread
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
