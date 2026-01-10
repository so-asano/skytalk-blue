"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
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
  createdAt: string;
}

interface Comment {
  id: string;
  threadId: string;
  text: string;
  authorDid: string;
  createdAt: string;
}

interface NotificationWithContent extends Notification {
  type: "thread" | "comment";
  thread?: Thread;
  comment?: Comment;
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
        const res = await fetch(`${API_URL}/api/notifications/${user.did}`);
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
                // Ignore
              }
              return { ...notification, type: "thread" as const };
            } else {
              // For comments, we need to find the thread first
              // The comment tid can be used to find it in any thread's comments
              // For now, just mark as comment type
              return { ...notification, type: "comment" as const };
            }
          })
        );

        setNotifications(withContent);

        // Mark all as read
        await fetch(`${API_URL}/api/notifications/${user.did}/read-all`, {
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
            const isUnread = !notification.markedAsReadAt;
            const parsed = parseAtUri(notification.atUri);

            return (
              <Card
                key={notification.id}
                className={isUnread ? "border-primary/50 bg-primary/5" : ""}
              >
                <CardContent className="py-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    {notification.type === "thread"
                      ? t("notifications.mentionedInThread")
                      : t("notifications.mentionedInComment")}
                    {" · "}
                    {formatDate(notification.createdAt, locale)}
                  </div>

                  {notification.thread && (
                    <Link
                      href={`/${notification.thread.channelId}/${notification.thread.id}`}
                      className="block hover:opacity-80"
                    >
                      <h3 className="font-bold mb-2">{notification.thread.title}</h3>
                      {notification.thread.text && (
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          <Markdown>{notification.thread.text}</Markdown>
                        </div>
                      )}
                    </Link>
                  )}

                  {!notification.thread && parsed && (
                    <a
                      href={`https://pdsls.dev/${notification.atUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-muted-foreground/60 font-mono truncate hover:underline"
                    >
                      {notification.atUri}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
