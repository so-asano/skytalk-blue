"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { useI18n } from "@/lib/i18n";
import { useAuth, authenticatedFetch } from "@/lib/auth";
import { getHandlesByDids } from "@/lib/bsky";
import { formatDate } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Notification {
  id: number;
  did: string;
  atUri: string;
  markedAsReadAt: string | null;
  createdAt: string;
}

interface Thread {
  id: string;
  channelId: string;
  title: string;
  text: string | null;
  authorDid: string;
  authorHandle?: string;
  createdAt: string;
  atUri: string;
}

interface Comment {
  id: string;
  threadId: string;
  text: string;
  authorDid: string;
  authorHandle?: string;
  createdAt: string;
  atUri: string;
}

interface NotificationWithContent extends Notification {
  type: "thread" | "comment";
  thread?: Thread;
  comment?: Comment;
  parentThread?: Thread; // For comments, the thread it belongs to
}

// Extract thread/comment info from AT URI
function parseAtUri(atUri: string): { type: "thread" | "comment"; tid: string } | null {
  const parts = atUri.replace("at://", "").split("/");
  if (parts.length < 3) return null;
  const collection = parts[1];
  const tid = parts[2];
  if (collection.includes("thread")) {
    return { type: "thread", tid };
  } else if (collection.includes("comment")) {
    return { type: "comment", tid };
  }
  return null;
}

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndMarkRead() {
      if (authLoading) return;
      if (!user?.did) {
        setLoading(false);
        return;
      }

      try {
        // Fetch notifications
        const res = await authenticatedFetch(`${API_URL}/api/notifications/${user.did}`, user.did);
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data: Notification[] = await res.json();

        // Fetch content for each notification
        const withContent: NotificationWithContent[] = await Promise.all(
          data.map(async (notification) => {
            const parsed = parseAtUri(notification.atUri);
            if (!parsed) {
              return { ...notification, type: "thread" as const };
            }

            if (parsed.type === "thread") {
              try {
                const threadRes = await fetch(`${API_URL}/api/threads/${parsed.tid}`);
                if (threadRes.ok) {
                  const threadData = await threadRes.json();
                  return { ...notification, type: "thread" as const, thread: threadData.thread };
                }
              } catch {
                // Thread may be deleted
              }
              return { ...notification, type: "thread" as const };
            } else {
              // Fetch comment with thread info
              try {
                const commentRes = await fetch(`${API_URL}/api/comments/${parsed.tid}`);
                if (commentRes.ok) {
                  const commentData = await commentRes.json();
                  return {
                    ...notification,
                    type: "comment" as const,
                    comment: commentData.comment,
                    parentThread: commentData.thread,
                  };
                }
              } catch {
                // Comment may be deleted
              }
              return { ...notification, type: "comment" as const };
            }
          })
        );

        // Resolve handles for all DIDs
        const allDids = withContent
          .flatMap((n) => [n.thread?.authorDid, n.comment?.authorDid])
          .filter(Boolean) as string[];
        const handleMap = await getHandlesByDids(allDids);

        // Add handles to notifications
        const withHandles = withContent.map((n) => ({
          ...n,
          thread: n.thread
            ? { ...n.thread, authorHandle: handleMap.get(n.thread.authorDid) || n.thread.authorDid }
            : undefined,
          comment: n.comment
            ? { ...n.comment, authorHandle: handleMap.get(n.comment.authorDid) || n.comment.authorDid }
            : undefined,
        }));

        setNotifications(withHandles);

        // Mark all as read
        await authenticatedFetch(`${API_URL}/api/notifications/${user.did}/read-all`, user.did, {
          method: "PUT",
        });
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAndMarkRead();
  }, [user?.did, authLoading]);

  // Redirect to 404 if not logged in
  if (!authLoading && !user) {
    notFound();
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: t("notifications.title") },
        ]}
        className="mb-6"
      />

      <div className="flex flex-col gap-4">
        {loading || authLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("notifications.empty")}
          </p>
        ) : (
          notifications.map((notification) => {
            // Thread notification - same format as thread page
            if (notification.type === "thread" && notification.thread) {
              const thread = notification.thread;
              return (
                <Card
                  key={notification.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/${thread.channelId}/${thread.id}`)}
                >
                  <CardContent className="py-5 px-5">
                    <h2 className="text-xl font-bold leading-relaxed mb-2">
                      {thread.title}
                    </h2>
                    <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      <a
                        href={`https://bsky.app/profile/${thread.authorDid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{thread.authorHandle || thread.authorDid}
                      </a>
                      <span>· {formatDate(thread.createdAt, locale)}</span>
                    </div>
                    {thread.text && (
                      <div className="prose prose-sm max-w-none mb-4">
                        <Markdown>{thread.text}</Markdown>
                      </div>
                    )}
                    <a
                      href={`https://pdsls.dev/${thread.atUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {thread.atUri}
                    </a>
                  </CardContent>
                </Card>
              );
            }

            // Comment notification - same format as thread page comments
            if (notification.type === "comment" && notification.comment && notification.parentThread) {
              const comment = notification.comment;
              const parentThread = notification.parentThread;
              return (
                <Card
                  key={notification.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/${parentThread.channelId}/${parentThread.id}#comment-${comment.id}`)}
                >
                  <CardContent className="py-5 px-5">
                    <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      <a
                        href={`https://bsky.app/profile/${comment.authorDid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{comment.authorHandle || comment.authorDid}
                      </a>
                      <span>· {formatDate(comment.createdAt, locale)}</span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{comment.text}</Markdown>
                    </div>
                    <a
                      href={`https://pdsls.dev/${comment.atUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {comment.atUri}
                    </a>
                  </CardContent>
                </Card>
              );
            }

            // Fallback for deleted content
            return (
              <Card key={notification.id} className="opacity-50">
                <CardContent className="py-5 px-5">
                  <p className="text-muted-foreground">
                    {notification.type === "thread"
                      ? t("notifications.threadDeleted")
                      : t("notifications.commentDeleted")}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
