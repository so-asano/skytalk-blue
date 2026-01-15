import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { channels, threads, comments, notifications, reactions, threadEvents, commentEvents } from "./db/schema.js";
import { seedChannels } from "./db/seed.js";
import { eq, desc, isNull, and, gt, count, inArray } from "drizzle-orm";
import { jetstreamService } from "./services/jetstream.js";
import { createSiteAuthMiddleware, requireUserAuth, AuthenticatedRequest } from "./auth.js";
import { extractUrls, getOgpBatch } from "./services/ogp.js";
import { getImage, ImageSize } from "./services/images.js";

const app = express();
const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.API_SECRET || "";
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const requireSiteAuth = createSiteAuthMiddleware(API_SECRET, TOKEN_EXPIRY_MS);

const BSKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";

// Add a reaction to the JSON field (deduplicates DIDs)
async function addReactionToSubject(subjectUri: string, emoji: string, authorDid: string) {
  // Check if it's a thread or comment
  if (subjectUri.includes("/blue.skytalk.talk.thread/")) {
    const thread = await db.select().from(threads).where(eq(threads.atUri, subjectUri)).limit(1);
    if (thread.length > 0) {
      const currentReactions = (thread[0].reactions || {}) as Record<string, string[]>;
      const dids = currentReactions[emoji] || [];
      if (!dids.includes(authorDid)) {
        currentReactions[emoji] = [...dids, authorDid];
        await db.update(threads)
          .set({ reactions: currentReactions, updatedAt: new Date() })
          .where(eq(threads.atUri, subjectUri));
      }
    }
  } else if (subjectUri.includes("/blue.skytalk.talk.comment/")) {
    const comment = await db.select().from(comments).where(eq(comments.atUri, subjectUri)).limit(1);
    if (comment.length > 0) {
      const currentReactions = (comment[0].reactions || {}) as Record<string, string[]>;
      const dids = currentReactions[emoji] || [];
      if (!dids.includes(authorDid)) {
        currentReactions[emoji] = [...dids, authorDid];
        await db.update(comments)
          .set({ reactions: currentReactions, updatedAt: new Date() })
          .where(eq(comments.atUri, subjectUri));
      }
    }
  }
}

// Remove a reaction from the JSON field
async function removeReactionFromSubject(subjectUri: string, emoji: string, authorDid: string) {
  if (subjectUri.includes("/blue.skytalk.talk.thread/")) {
    const thread = await db.select().from(threads).where(eq(threads.atUri, subjectUri)).limit(1);
    if (thread.length > 0) {
      const currentReactions = (thread[0].reactions || {}) as Record<string, string[]>;
      const dids = currentReactions[emoji] || [];
      const filtered = dids.filter(d => d !== authorDid);
      if (filtered.length > 0) {
        currentReactions[emoji] = filtered;
      } else {
        delete currentReactions[emoji];
      }
      await db.update(threads)
        .set({ reactions: currentReactions, updatedAt: new Date() })
        .where(eq(threads.atUri, subjectUri));
    }
  } else if (subjectUri.includes("/blue.skytalk.talk.comment/")) {
    const comment = await db.select().from(comments).where(eq(comments.atUri, subjectUri)).limit(1);
    if (comment.length > 0) {
      const currentReactions = (comment[0].reactions || {}) as Record<string, string[]>;
      const dids = currentReactions[emoji] || [];
      const filtered = dids.filter(d => d !== authorDid);
      if (filtered.length > 0) {
        currentReactions[emoji] = filtered;
      } else {
        delete currentReactions[emoji];
      }
      await db.update(comments)
        .set({ reactions: currentReactions, updatedAt: new Date() })
        .where(eq(comments.atUri, subjectUri));
    }
  }
}

// Update thread commentCount by counting actual comments
async function updateThreadCommentCount(threadId: string) {
  const result = await db
    .select({ count: count() })
    .from(comments)
    .where(and(eq(comments.threadId, threadId), isNull(comments.deletedAt)));

  await db
    .update(threads)
    .set({ commentCount: result[0].count, updatedAt: new Date() })
    .where(eq(threads.id, threadId));
}

// Extract @mentions from text (e.g., @user.bsky.social)
function extractMentions(text: string | null | undefined): string[] {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[0].slice(1)); // Remove @ prefix
  }
  return [...new Set(mentions)].slice(0, 10);
}

// Resolve handles to DIDs using Bluesky public API
async function resolveHandlesToDids(handles: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (handles.length === 0) return results;

  try {
    const params = new URLSearchParams();
    handles.forEach((handle) => params.append("actors", handle));

    const res = await fetch(`${BSKY_PUBLIC_API}/app.bsky.actor.getProfiles?${params}`);
    if (!res.ok) return results;

    const data = await res.json() as { profiles?: Array<{ did?: string; handle?: string }> };
    for (const profile of data.profiles || []) {
      if (profile.did && profile.handle) {
        results.set(profile.handle, profile.did);
      }
    }
  } catch {
    // Ignore errors
  }

  return results;
}

// Extract mentioned DIDs from text
async function extractMentionedDids(text: string | null | undefined): Promise<string[]> {
  const handles = extractMentions(text);
  if (handles.length === 0) return [];

  const handleToDid = await resolveHandlesToDids(handles);
  return Array.from(handleToDid.values());
}

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["*"];

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes("*")) {
      callback(null, "*");
    } else if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Timestamp", "X-Signature"],
}));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  const jetstreamStatus = jetstreamService.getStatus();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    jetstream: jetstreamStatus,
  });
});

// Image proxy with optional R2 caching
// Query params: size=original|thumb (default: original)
app.get("/api/images/:did/:cid", async (req, res) => {
  const { did, cid } = req.params;
  const size = (req.query.size as ImageSize) || "original";

  if (!["original", "thumb"].includes(size)) {
    res.status(400).json({ error: "Invalid size parameter" });
    return;
  }

  try {
    const result = await getImage(did, cid, size);

    if (!result) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    // Set cache headers
    res.set({
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Cache": result.cacheHit ? "HIT" : "MISS",
    });

    res.send(result.buffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

// Get all channels
app.get("/api/channels", async (_req, res) => {
  try {
    const allChannels = await db
      .select()
      .from(channels)
      .where(isNull(channels.deletedAt))
      .orderBy(channels.id);
    res.json(allChannels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// Get single channel
app.get("/api/channels/:id", async (req, res) => {
  try {
    const channel = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, req.params.id), isNull(channels.deletedAt)))
      .limit(1);

    if (channel.length === 0) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    res.json(channel[0]);
  } catch (error) {
    console.error("Error fetching channel:", error);
    res.status(500).json({ error: "Failed to fetch channel" });
  }
});

// Get threads with cursor-based pagination
// Query params:
//   - afterId: get threads newer than this ID (for polling)
//   - channelId: filter by channel
//   - limit: max number of threads (default 50)
app.get("/api/threads", async (req, res) => {
  try {
    const { afterId, channelId, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam as string) || 50, 100);

    const conditions = [isNull(threads.deletedAt)];

    if (channelId) {
      conditions.push(eq(threads.channelId, channelId as string));
    }

    if (afterId) {
      // Get threads newer than afterId (for polling)
      conditions.push(gt(threads.id, afterId as string));
      const newThreads = await db
        .select()
        .from(threads)
        .where(and(...conditions))
        .orderBy(desc(threads.updatedAt))
        .limit(limit);

      const newestId = newThreads.length > 0
        ? newThreads[0].id
        : afterId as string;

      // Extract URLs and fetch OGP
      const allUrls = newThreads.flatMap(t => extractUrls(t.text));
      const ogp = allUrls.length > 0 ? await getOgpBatch(allUrls) : {};

      res.json({
        threads: newThreads,
        newestId,
        hasMore: newThreads.length === limit,
        ogp,
      });
    } else {
      // Initial load - get latest threads by update time
      const allThreads = await db
        .select()
        .from(threads)
        .where(and(...conditions))
        .orderBy(desc(threads.updatedAt))
        .limit(limit);

      const newestId = allThreads.length > 0 ? allThreads[0].id : null;

      // Extract URLs and fetch OGP
      const allUrls = allThreads.flatMap(t => extractUrls(t.text));
      const ogp = allUrls.length > 0 ? await getOgpBatch(allUrls) : {};

      res.json({
        threads: allThreads,
        newestId,
        hasMore: allThreads.length === limit,
        ogp,
      });
    }
  } catch (error) {
    console.error("Error fetching threads:", error);
    res.status(500).json({ error: "Failed to fetch threads" });
  }
});

// Get single thread with comments
app.get("/api/threads/:id", async (req, res) => {
  try {
    const thread = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, req.params.id), isNull(threads.deletedAt)))
      .limit(1);

    if (thread.length === 0) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    // Get CID from threadEvents (latest CREATE event)
    const threadEvent = await db
      .select({ cid: threadEvents.cid })
      .from(threadEvents)
      .where(and(eq(threadEvents.atUri, thread[0].atUri), eq(threadEvents.action, "CREATE")))
      .orderBy(desc(threadEvents.createdAt))
      .limit(1);

    const threadComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.threadId, req.params.id), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);

    // Get CIDs for comments from commentEvents
    const commentUris = threadComments.map(c => c.atUri);
    const commentCids = commentUris.length > 0
      ? await db
          .select({ atUri: commentEvents.atUri, cid: commentEvents.cid })
          .from(commentEvents)
          .where(and(
            inArray(commentEvents.atUri, commentUris),
            eq(commentEvents.action, "CREATE")
          ))
      : [];

    const cidMap = new Map(commentCids.map(c => [c.atUri, c.cid]));

    // Extract URLs from thread and comments, fetch OGP
    const allUrls = [
      ...extractUrls(thread[0].text),
      ...threadComments.flatMap(c => extractUrls(c.text)),
    ];
    const ogp = allUrls.length > 0 ? await getOgpBatch(allUrls) : {};

    res.json({
      thread: { ...thread[0], cid: threadEvent[0]?.cid || null },
      comments: threadComments.map(c => ({ ...c, cid: cidMap.get(c.atUri) || null })),
      ogp,
    });
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.status(500).json({ error: "Failed to fetch thread" });
  }
});

// Create a thread
app.post("/api/threads", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const { title, text, channelId, authorDid, atUri, blobs } = req.body;

  if (!title || !channelId || !authorDid || !atUri) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Verify authorDid matches authenticated user
  if (authorDid !== req.authenticatedDid) {
    res.status(403).json({ error: "Author DID mismatch" });
    return;
  }

  try {
    // Extract TID from AT URI (at://did/collection/tid)
    const tid = atUri.split("/").pop();

    const [newThread] = await db
      .insert(threads)
      .values({
        id: tid,
        atUri,
        channelId,
        title,
        text,
        authorDid,
        commentCount: 0,
        blobs: blobs || [],
      })
      .returning();

    // Create notifications for mentioned users
    const allMentionedDids = await extractMentionedDids(text);
    const mentionedDids = allMentionedDids.filter(did => did !== authorDid);
    if (mentionedDids.length > 0) {
      await db.insert(notifications).values(
        mentionedDids.map(did => ({ did, atUri }))
      );
    }

    res.status(201).json(newThread);
  } catch (error) {
    console.error("Error creating thread:", error);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

// Delete a thread (soft delete)
app.delete("/api/threads/:id", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const thread = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, req.params.id), isNull(threads.deletedAt)))
      .limit(1);

    if (thread.length === 0) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    // Verify user owns the thread
    if (thread[0].authorDid !== req.authenticatedDid) {
      res.status(403).json({ error: "Not authorized to delete this thread" });
      return;
    }

    await db
      .update(threads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(threads.id, req.params.id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting thread:", error);
    res.status(500).json({ error: "Failed to delete thread" });
  }
});

// Add a comment to a thread
app.post("/api/threads/:id/comments", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const { text, authorDid, atUri, blobs } = req.body;

  if (!text || !authorDid || !atUri) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Verify authorDid matches authenticated user
  if (authorDid !== req.authenticatedDid) {
    res.status(403).json({ error: "Author DID mismatch" });
    return;
  }

  try {
    const thread = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, req.params.id), isNull(threads.deletedAt)))
      .limit(1);

    if (thread.length === 0) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    // Extract TID from AT URI (at://did/collection/tid)
    const tid = atUri.split("/").pop();

    const [newComment] = await db
      .insert(comments)
      .values({
        id: tid,
        threadId: req.params.id,
        text,
        authorDid,
        atUri,
        blobs: blobs || [],
      })
      .returning();

    // Update thread commentCount
    await updateThreadCommentCount(req.params.id);

    // Create notifications for mentioned users
    const allMentionedDids = await extractMentionedDids(text);
    const mentionedDids = allMentionedDids.filter(did => did !== authorDid);
    if (mentionedDids.length > 0) {
      await db.insert(notifications).values(
        mentionedDids.map(did => ({ did, atUri }))
      );
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Get single comment with thread info
app.get("/api/comments/:id", async (req, res) => {
  try {
    const comment = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, req.params.id), isNull(comments.deletedAt)))
      .limit(1);

    if (comment.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    // Get thread info
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, comment[0].threadId))
      .limit(1);

    res.json({
      comment: comment[0],
      thread: thread.length > 0 ? thread[0] : null,
    });
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({ error: "Failed to fetch comment" });
  }
});

// Delete a comment (soft delete)
app.delete("/api/comments/:id", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const comment = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, req.params.id), isNull(comments.deletedAt)))
      .limit(1);

    if (comment.length === 0) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    // Verify user owns the comment
    if (comment[0].authorDid !== req.authenticatedDid) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }

    await db
      .update(comments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(comments.id, req.params.id));

    // Update thread comment count
    await updateThreadCommentCount(comment[0].threadId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Get notifications for a user
app.get("/api/notifications/:did", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  // Verify user is fetching their own notifications
  if (req.params.did !== req.authenticatedDid) {
    res.status(403).json({ error: "Not authorized to view these notifications" });
    return;
  }

  try {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.did, req.params.did), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt));

    res.json(userNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
app.put("/api/notifications/:id/read", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // First get the notification to verify ownership
    const notification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, parseInt(req.params.id)))
      .limit(1);

    if (notification.length === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    if (notification[0].did !== req.authenticatedDid) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    const now = new Date();
    await db
      .update(notifications)
      .set({ markedAsReadAt: now, updatedAt: now })
      .where(eq(notifications.id, parseInt(req.params.id)));

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read for a user
app.put("/api/notifications/:did/read-all", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  // Verify user is marking their own notifications
  if (req.params.did !== req.authenticatedDid) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  try {
    const now = new Date();
    await db
      .update(notifications)
      .set({ markedAsReadAt: now, updatedAt: now })
      .where(and(eq(notifications.did, req.params.did), isNull(notifications.markedAsReadAt)));

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

// Get user's post history (threads and comments combined, sorted by createdAt DESC)
app.get("/api/history/:did", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  // Verify user is fetching their own history
  if (req.params.did !== req.authenticatedDid) {
    res.status(403).json({ error: "Not authorized to view this history" });
    return;
  }

  try {
    // Get user's threads
    const userThreads = await db
      .select()
      .from(threads)
      .where(and(eq(threads.authorDid, req.params.did), isNull(threads.deletedAt)));

    // Get user's comments
    const userComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.authorDid, req.params.did), isNull(comments.deletedAt)));

    // Get parent thread info for comments
    const threadIds = [...new Set(userComments.map(c => c.threadId))];
    const parentThreads = threadIds.length > 0
      ? await db
          .select()
          .from(threads)
          .where(inArray(threads.id, threadIds))
      : [];

    const threadMap = new Map(parentThreads.map(t => [t.id, t]));

    // Combine and sort by createdAt DESC
    const items = [
      ...userThreads.map(t => ({
        type: "thread" as const,
        createdAt: t.createdAt,
        thread: t,
      })),
      ...userComments.map(c => ({
        type: "comment" as const,
        createdAt: c.createdAt,
        comment: {
          ...c,
          parentThread: threadMap.get(c.threadId) || null,
        },
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get reactions for a subject (thread or comment)
app.get("/api/reactions", async (req, res) => {
  const { subjectUri } = req.query;

  if (!subjectUri || typeof subjectUri !== "string") {
    res.status(400).json({ error: "subjectUri is required" });
    return;
  }

  try {
    const result = await db
      .select()
      .from(reactions)
      .where(and(eq(reactions.subjectUri, subjectUri), isNull(reactions.deletedAt)))
      .orderBy(desc(reactions.createdAt));

    res.json(result);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Create a reaction
app.post("/api/reactions", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const { id, subjectUri, subjectCid, emoji, atUri } = req.body;
  const authorDid = req.authenticatedDid;

  if (!id || !subjectUri || !subjectCid || !emoji || !atUri || !authorDid) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    // Check if user already reacted with this emoji
    const existing = await db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.subjectUri, subjectUri),
          eq(reactions.authorDid, authorDid),
          eq(reactions.emoji, emoji),
          isNull(reactions.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Already reacted with this emoji" });
      return;
    }

    const newReaction = await db
      .insert(reactions)
      .values({
        id,
        atUri,
        subjectUri,
        subjectCid,
        authorDid,
        emoji,
      })
      .returning();

    // Update the JSON field on thread/comment
    await addReactionToSubject(subjectUri, emoji, authorDid);

    res.status(201).json(newReaction[0]);
  } catch (error) {
    console.error("Error creating reaction:", error);
    res.status(500).json({ error: "Failed to create reaction" });
  }
});

// Delete a reaction
app.delete("/api/reactions/:id", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const reaction = await db
      .select()
      .from(reactions)
      .where(and(eq(reactions.id, req.params.id), isNull(reactions.deletedAt)))
      .limit(1);

    if (reaction.length === 0) {
      res.status(404).json({ error: "Reaction not found" });
      return;
    }

    if (reaction[0].authorDid !== req.authenticatedDid) {
      res.status(403).json({ error: "Not authorized to delete this reaction" });
      return;
    }

    await db
      .update(reactions)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(reactions.id, req.params.id));

    // Update the JSON field on thread/comment
    await removeReactionFromSubject(reaction[0].subjectUri, reaction[0].emoji, reaction[0].authorDid);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting reaction:", error);
    res.status(500).json({ error: "Failed to delete reaction" });
  }
});

async function startServer() {
  try {
    await seedChannels();

    // Start Jetstream subscription service
    await jetstreamService.start();

    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📡 Received SIGTERM, shutting down gracefully");
  await jetstreamService.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📡 Received SIGINT, shutting down gracefully");
  await jetstreamService.stop();
  process.exit(0);
});

startServer();
