import { z } from "zod";

export const LEXICONS = {
  THREAD: "blue.skytalk.talk.thread",
  COMMENT: "blue.skytalk.talk.comment",
  REACTION: "blue.skytalk.talk.reaction",
} as const;

export type LexiconType = (typeof LEXICONS)[keyof typeof LEXICONS];

/**
 * Zod schema for blue.skytalk.talk.thread
 */
export const ThreadRecordSchema = z.object({
  channelId: z.string().describe("The channel this thread belongs to"),
  title: z
    .string()
    .max(300)
    .describe("The title of the thread"),
  text: z
    .string()
    .max(4000)
    .optional()
    .describe("The text content of the thread"),
  createdAt: z.string().datetime().describe("Timestamp of thread creation"),
});

export type ThreadRecord = z.infer<typeof ThreadRecordSchema>;

/**
 * Zod schema for blue.skytalk.talk.comment
 */
export const CommentRecordSchema = z.object({
  threadUri: z
    .string()
    .refine((uri) => uri.startsWith("at://"), {
      message: "Must be a valid AT-URI",
    })
    .describe("AT URI of the thread this post belongs to"),
  text: z
    .string()
    .max(4000)
    .describe("The content of the post"),
  createdAt: z.string().datetime().describe("Timestamp of post creation"),
});

export type CommentRecord = z.infer<typeof CommentRecordSchema>;

/**
 * Validate thread record
 */
export function validateThreadRecord(data: unknown) {
  return ThreadRecordSchema.safeParse(data);
}

/**
 * Validate comment record
 */
export function validateCommentRecord(data: unknown) {
  return CommentRecordSchema.safeParse(data);
}

/**
 * Zod schema for com.atproto.repo.strongRef
 */
export const StrongRefSchema = z.object({
  uri: z.string().refine((uri) => uri.startsWith("at://"), {
    message: "Must be a valid AT-URI",
  }),
  cid: z.string(),
});

/**
 * Zod schema for blue.skytalk.talk.reaction
 */
export const ReactionRecordSchema = z.object({
  subject: StrongRefSchema.describe("Reference to the thread or comment being reacted to"),
  emoji: z
    .string()
    .max(32)
    .describe("The emoji used for the reaction"),
  createdAt: z.string().datetime().describe("Timestamp of reaction creation"),
});

export type ReactionRecord = z.infer<typeof ReactionRecordSchema>;

/**
 * Validate reaction record
 */
export function validateReactionRecord(data: unknown) {
  return ReactionRecordSchema.safeParse(data);
}
