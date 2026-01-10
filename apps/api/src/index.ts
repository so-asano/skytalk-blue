import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { channels, threads, comments } from "./db/schema.js";
import { seedChannels } from "./db/seed.js";
import { eq, desc, isNull, and, gt, asc } from "drizzle-orm";
import { jetstreamService } from "./services/jetstream.js";

const app = express();
const PORT = process.env.PORT || 3001;

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

// Create a channel
app.post("/api/channels", async (req, res) => {
  const { id, nameJa, nameEn } = req.body;

  if (!id || !nameJa || !nameEn) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const [newChannel] = await db
      .insert(channels)
      .values({ id, nameJa, nameEn })
      .returning();

    res.status(201).json(newChannel);
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
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
app.post("/api/threads", async (req, res) => {
  const { title, text, channelId, authorDid, atUri } = req.body;

  if (!title || !channelId || !authorDid || !atUri) {
    res.status(400).json({ error: "Missing required fields" });
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

    res.status(201).json(newThread);
  } catch (error) {
    console.error("Error creating thread:", error);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

// Delete a thread (soft delete)
app.delete("/api/threads/:id", async (req, res) => {
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
app.post("/api/threads/:id/comments", async (req, res) => {
  const { text, authorDid, atUri } = req.body;

  if (!text || !authorDid || !atUri) {
    res.status(400).json({ error: "Missing required fields" });
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

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// Delete a comment (soft delete)
app.delete("/api/comments/:id", async (req, res) => {
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
