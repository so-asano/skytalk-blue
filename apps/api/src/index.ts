import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import crypto from "crypto";
import { db } from "./db/index.js";
import { channels, threads, comments, notifications } from "./db/schema.js";
import { seedChannels } from "./db/seed.js";
import { eq, desc, isNull, and, gt, asc } from "drizzle-orm";
import { jetstreamService } from "./services/jetstream.js";

const app = express();
const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.API_SECRET || "";
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const BSKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";

// HMAC verification
function verifyHmac(timestamp: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", API_SECRET)
    .update(timestamp)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Decode JWT without verification (to extract DID from sub claim)
function decodeJwt(token: string): { sub?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload;
  } catch {
    return null;
  }
}

// Site-level protection middleware (HMAC + timestamp)
function requireSiteAuth(req: Request, res: Response, next: NextFunction) {
  const timestamp = req.headers["x-timestamp"] as string;
  const signature = req.headers["x-signature"] as string;

  if (!timestamp || !signature) {
    res.status(403).json({ error: "Missing signature" });
    return;
  }

  // Check timestamp is within 5 minutes
  if (Date.now() - parseInt(timestamp) > TOKEN_EXPIRY_MS) {
    res.status(403).json({ error: "Request expired" });
    return;
  }

  // Verify HMAC
  try {
    if (!verifyHmac(timestamp, signature)) {
      res.status(403).json({ error: "Invalid signature" });
      return;
    }
  } catch {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  next();
}

// User-level protection middleware (requires Bearer token)
interface AuthenticatedRequest extends Request {
  authenticatedDid?: string;
}

function requireUserAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const jwtPayload = decodeJwt(token);

  if (!jwtPayload?.sub) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.authenticatedDid = jwtPayload.sub;
  next();
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
  allowedHeaders: ["Content-Type", "Authorization"],
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

      res.json({
        threads: newThreads,
        newestId,
        hasMore: newThreads.length === limit,
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

      res.json({
        threads: allThreads,
        newestId,
        hasMore: allThreads.length === limit,
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

    const threadComments = await db
      .select()
      .from(comments)
      .where(and(eq(comments.threadId, req.params.id), isNull(comments.deletedAt)))
      .orderBy(comments.createdAt);

    res.json({ thread: thread[0], comments: threadComments });
  } catch (error) {
    console.error("Error fetching thread:", error);
    res.status(500).json({ error: "Failed to fetch thread" });
  }
});

// Create a thread
app.post("/api/threads", requireSiteAuth, requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const { title, text, channelId, authorDid, atUri } = req.body;

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
  const { text, authorDid, atUri } = req.body;

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
      })
      .returning();

    // Update thread commentCount
    await db
      .update(threads)
      .set({ commentCount: thread[0].commentCount + 1, updatedAt: new Date() })
      .where(eq(threads.id, req.params.id));

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

    // Decrement thread comment count
    const thread = await db
      .select()
      .from(threads)
      .where(eq(threads.id, comment[0].threadId))
      .limit(1);

    if (thread.length > 0 && thread[0].commentCount > 0) {
      await db
        .update(threads)
        .set({ commentCount: thread[0].commentCount - 1, updatedAt: new Date() })
        .where(eq(threads.id, comment[0].threadId));
    }

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
