import { Jetstream, CommitCreateEvent, CommitUpdateEvent, CommitDeleteEvent, JetstreamOptions } from "@skyware/jetstream";
import { db } from "../db/index.js";
import { comments, threads, jetstreamCursors, threadEvents, commentEvents } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  LEXICONS,
  validateThreadRecord,
  validateCommentRecord,
  type ThreadRecord,
  type CommentRecord,
} from "../lexicons/schemas.js";

export class JetstreamService {
  private jetstream?: Jetstream;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private serviceId: string;
  private currentCursor: number | null = null;

  // Metrics
  private startTime = Date.now();
  private messageCount = 0;
  private connectionCount = 0;
  private errorCount = 0;
  private lastConnectedAt: Date | null = null;
  private lastDisconnectedAt: Date | null = null;
  private isManualStop = false;

  constructor(environment?: string) {
    this.serviceId = environment || process.env.JETSTREAM_ENV || process.env.NODE_ENV || "development";
    console.log(`🔧 Jetstream service initialized for environment: ${this.serviceId}`);
  }

  async start(): Promise<void> {
    try {
      console.log("🚀 Starting Jetstream subscription service...");

      const savedCursor = await this.loadCursor();
      this.currentCursor = savedCursor ? Number(savedCursor) : null;

      if (this.currentCursor) {
        console.log(`📍 Loaded saved cursor: ${this.currentCursor}`);
      } else {
        console.log("📍 No saved cursor found, starting from live");
      }

      const jetstreamOptions: JetstreamOptions = {
        wantedCollections: [LEXICONS.THREAD, LEXICONS.COMMENT],
      };

      if (savedCursor) {
        console.log("📍 Resuming from saved cursor:", savedCursor);
        jetstreamOptions.cursor = Number(savedCursor);
      }

      this.jetstream = new Jetstream(jetstreamOptions);
      this.setupEventHandlers();

      this.jetstream.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log("✅ Jetstream subscription service started");
      console.log("📡 Subscribed to lexicons:", [LEXICONS.THREAD, LEXICONS.COMMENT]);
    } catch (error) {
      console.error("❌ Failed to start Jetstream service:", error);
      await this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.jetstream) return;

    // Thread events
    this.jetstream.onCreate(LEXICONS.THREAD, (event) => {
      console.log("📝 Thread created:", event.commit.rkey);
      this.handleThreadEvent(event, "CREATE");
    });

    this.jetstream.onUpdate(LEXICONS.THREAD, (event) => {
      console.log("📝 Thread updated:", event.commit.rkey);
      this.handleThreadEvent(event, "UPDATE");
    });

    this.jetstream.onDelete(LEXICONS.THREAD, (event) => {
      console.log("🗑️ Thread deleted:", event.commit.rkey);
      this.handleThreadEvent(event, "DELETE");
    });

    // Comment events
    this.jetstream.onCreate(LEXICONS.COMMENT, (event) => {
      console.log("💬 Comment created:", event.commit.rkey);
      this.handleCommentEvent(event, "CREATE");
    });

    this.jetstream.onUpdate(LEXICONS.COMMENT, (event) => {
      console.log("💬 Comment updated:", event.commit.rkey);
      this.handleCommentEvent(event, "UPDATE");
    });

    this.jetstream.onDelete(LEXICONS.COMMENT, (event) => {
      console.log("🗑️ Comment deleted:", event.commit.rkey);
      this.handleCommentEvent(event, "DELETE");
    });

    // Connection events
    this.jetstream.on("open", () => {
      console.log("=".repeat(50));
      console.log("🔗 Jetstream connection opened");
      console.log(`📍 Connection opened with Jetstream cursor: ${this.jetstream?.cursor || "live"}`);
      console.log(`📍 Service currentCursor: ${this.currentCursor || "none"}`);
      console.log("=".repeat(50));

      this.isConnected = true;
      this.connectionCount++;
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
    });

    this.jetstream.on("close", () => {
      console.log("🔌 Jetstream connection closed");
      this.isConnected = false;
      this.lastDisconnectedAt = new Date();

      if (!this.isManualStop && this.currentCursor) {
        console.log(`💾 Saving cursor on close: ${this.currentCursor}`);
        this.saveCursor(BigInt(this.currentCursor), "close").catch((error) => {
          console.error("Failed to save cursor on close:", error);
        });
      }

      if (this.isManualStop) {
        this.isManualStop = false;
        return;
      }

      this.handleReconnect();
    });

    this.jetstream.on("error", (error) => {
      console.error("❌ Jetstream error:", error);
      this.isConnected = false;
      this.errorCount++;

      if (this.currentCursor) {
        console.log(`💾 Saving cursor on error: ${this.currentCursor}`);
        this.saveCursor(BigInt(this.currentCursor), "error").catch((error) => {
          console.error("Failed to save cursor on error:", error);
        });
      }

      this.handleReconnect();
    });
  }

  private async handleThreadEvent(
    event: CommitCreateEvent<typeof LEXICONS.THREAD> | CommitUpdateEvent<typeof LEXICONS.THREAD> | CommitDeleteEvent<typeof LEXICONS.THREAD>,
    action: "CREATE" | "UPDATE" | "DELETE"
  ): Promise<void> {
    try {
      this.messageCount++;

      if (event.time_us && this.currentCursor && event.time_us <= this.currentCursor) {
        console.log(`Ignoring duplicate/outdated thread event: cursor ${event.time_us} <= ${this.currentCursor}`);
        return;
      }

      const { commit } = event;
      const repo = event.did;
      const atUri = `at://${repo}/${LEXICONS.THREAD}/${commit.rkey}`;

      let record: ThreadRecord | null = null;
      if (action !== "DELETE" && "record" in commit) {
        const validation = validateThreadRecord(commit.record);
        if (!validation.success) {
          console.error("Invalid thread record:", validation.error.issues);
          return;
        }
        record = validation.data;
      }

      const cursor = BigInt(event.time_us || Date.now() * 1000);

      // Log to thread_events table
      try {
        await db.insert(threadEvents).values({
          repo,
          atUri,
          cid: "cid" in commit ? commit.cid : null,
          channelId: record?.channelId || null,
          title: record?.title || null,
          textContent: record?.text || null,
          action,
          cursor,
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "23505") {
          console.log(`Thread event with cursor ${cursor} already processed for ${atUri}`);
          return;
        }
        throw error;
      }

      // Update threads table
      if (action === "CREATE" && record) {
        console.log(`Thread CREATE event for ${atUri} - channel: ${record.channelId}`);
      } else if (action === "DELETE") {
        // Mark thread as deleted
        await db
          .update(threads)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(threads.atUri, atUri));
        console.log(`Thread DELETE event for ${atUri}`);
      }

      if (event.time_us) {
        this.currentCursor = event.time_us;
      }
    } catch (error) {
      console.error("Error handling thread event:", error);
    }
  }

  private async handleCommentEvent(
    event: CommitCreateEvent<typeof LEXICONS.COMMENT> | CommitUpdateEvent<typeof LEXICONS.COMMENT> | CommitDeleteEvent<typeof LEXICONS.COMMENT>,
    action: "CREATE" | "UPDATE" | "DELETE"
  ): Promise<void> {
    try {
      this.messageCount++;

      if (event.time_us && this.currentCursor && event.time_us <= this.currentCursor) {
        console.log(`Ignoring duplicate/outdated comment event: cursor ${event.time_us} <= ${this.currentCursor}`);
        return;
      }

      const { commit } = event;
      const repo = event.did;
      const atUri = `at://${repo}/${LEXICONS.COMMENT}/${commit.rkey}`;

      let record: CommentRecord | null = null;
      if (action !== "DELETE" && "record" in commit) {
        const validation = validateCommentRecord(commit.record);
        if (!validation.success) {
          console.error("Invalid comment record:", validation.error.issues);
          return;
        }
        record = validation.data;
      }

      const cursor = BigInt(event.time_us || Date.now() * 1000);

      // Log to comment_events table
      try {
        await db.insert(commentEvents).values({
          repo,
          atUri,
          cid: "cid" in commit ? commit.cid : null,
          threadUri: record?.threadUri || null,
          textContent: record?.text || null,
          action,
          cursor,
        });
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error && error.code === "23505") {
          console.log(`Comment event with cursor ${cursor} already processed for ${atUri}`);
          return;
        }
        throw error;
      }

      // Handle comment sync
      if (action === "CREATE" && record) {
        console.log(`Comment CREATE event for ${atUri} - threadUri: ${record.threadUri}`);
      } else if (action === "DELETE") {
        // Get comment to find threadId
        const comment = await db
          .select()
          .from(comments)
          .where(eq(comments.atUri, atUri))
          .limit(1);

        if (comment.length > 0) {
          // Mark comment as deleted
          await db
            .update(comments)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(comments.atUri, atUri));

          // Decrement thread commentCount
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
        }
        console.log(`Comment DELETE event for ${atUri}`);
      }

      if (event.time_us) {
        this.currentCursor = event.time_us;
      }
    } catch (error) {
      console.error("Error handling comment event:", error);
    }
  }

  async stop(): Promise<void> {
    try {
      console.log("🛑 Stopping Jetstream subscription service...");

      let cursorToSave: number | null = null;
      if (this.currentCursor) {
        cursorToSave = this.currentCursor;
      } else if (this.jetstream?.cursor) {
        cursorToSave = this.jetstream.cursor;
      }

      if (cursorToSave) {
        await this.saveCursor(BigInt(cursorToSave), "stop");
        console.log(`✅ Cursor save completed on stop`);
      }

      if (this.jetstream) {
        this.isManualStop = true;
        this.jetstream.close();
      }
      this.isConnected = false;
      console.log("✅ Jetstream subscription service stopped");
    } catch (error) {
      console.error("❌ Failed to stop Jetstream service:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      messageCount: this.messageCount,
      connectionCount: this.connectionCount,
      errorCount: this.errorCount,
      currentCursor: this.currentCursor,
      jetstreamCursor: this.jetstream?.cursor || null,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      uptime: Date.now() - this.startTime,
    };
  }

  private async saveCursor(cursor: bigint, reason?: string): Promise<void> {
    try {
      await db.insert(jetstreamCursors).values({
        service: this.serviceId,
        cursor,
        reason,
      });
      console.log(`✅ Cursor saved: ${cursor} (reason: ${reason || "unknown"})`);
    } catch (error) {
      console.error("Failed to save cursor:", error);
    }
  }

  private async loadCursor(): Promise<bigint | null> {
    try {
      const saved = await db
        .select()
        .from(jetstreamCursors)
        .where(eq(jetstreamCursors.service, this.serviceId))
        .orderBy(desc(jetstreamCursors.createdAt))
        .limit(1);

      return saved[0]?.cursor || null;
    } catch (error) {
      console.error("Failed to load cursor:", error);
      return null;
    }
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached. Will retry in 5 minutes.`);
      setTimeout(() => {
        console.log("🔄 Resetting reconnection attempts after cooldown period");
        this.reconnectAttempts = 0;
        this.handleReconnect();
      }, 5 * 60 * 1000);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        console.error("Reconnection failed:", error);
      }
    }, delay);
  }
}

export const jetstreamService = new JetstreamService();
