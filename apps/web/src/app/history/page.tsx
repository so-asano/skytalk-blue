"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/markdown";
import { useI18n } from "@/lib/i18n";
import { useAuth, authenticatedFetch } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Thread {
  id: string;
  channelId: string;
  title: string;
  text: string | null;
  authorDid: string;
  createdAt: string;
  atUri: string;
}

interface Comment {
  id: string;
  threadId: string;
  text: string;
  authorDid: string;
  createdAt: string;
  atUri: string;
  parentThread: Thread | null;
}

interface HistoryItem {
  type: "thread" | "comment";
  createdAt: string;
  thread?: Thread;
  comment?: Comment;
}

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (authLoading) return;
      if (!user?.did) {
        setLoading(false);
        return;
      }

      try {
        const res = await authenticatedFetch(`${API_URL}/api/history/${user.did}`, user.did);
        if (!res.ok) {
          setLoading(false);
          return;
        }

        const data = await res.json();
        setItems(data.items);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
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
          { label: t("common.history") },
        ]}
        className="mb-6"
      />

      <div className="flex flex-col gap-4">
        {loading || authLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("history.empty")}
          </p>
        ) : (
          items.map((item) => {
            // Thread item
            if (item.type === "thread" && item.thread) {
              const thread = item.thread;
              return (
                <Card
                  key={`thread-${thread.id}`}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/${thread.channelId}/${thread.id}`)}
                >
                  <CardContent className="py-5 px-5">
                    <h2 className="text-xl font-bold leading-relaxed mb-2">
                      {thread.title}
                    </h2>
                    <div className="text-sm text-muted-foreground mb-3">
                      {formatDate(thread.createdAt, locale)}
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

            // Comment item
            if (item.type === "comment" && item.comment) {
              const comment = item.comment;
              const parentThread = comment.parentThread;
              return (
                <Card
                  key={`comment-${comment.id}`}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (parentThread) {
                      router.push(`/${parentThread.channelId}/${parentThread.id}#comment-${comment.id}`);
                    }
                  }}
                >
                  <CardContent className="py-5 px-5">
                    <div className="text-sm text-muted-foreground mb-3">
                      {formatDate(comment.createdAt, locale)}
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

            return null;
          })
        )}
      </div>
    </div>
  );
}
