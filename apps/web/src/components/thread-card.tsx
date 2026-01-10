"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export interface Thread {
  id: string;
  channelId: string;
  title: string;
  text: string | null;
  authorDid: string;
  authorHandle?: string;
  createdAt: string;
  commentCount: number;
}

interface ThreadCardProps {
  thread: Thread;
  channelName?: string;
  showChannel?: boolean;
  highlighted?: boolean;
}

export function ThreadCard({ thread, channelName, showChannel = true, highlighted = false }: ThreadCardProps) {
  const { t, locale } = useI18n();

  const displayChannelName = channelName || t(`channel.names.${thread.channelId}`);

  return (
    <Link href={`/${thread.channelId}/${thread.id}`}>
      <Card className={`cursor-pointer hover:bg-accent/50 transition-colors ${highlighted ? "bg-primary/10 ring-2 ring-primary/30" : ""}`}>
        <CardContent className="py-4 px-5">
          {showChannel && (
            <div className="mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                #{displayChannelName}
              </span>
            </div>
          )}
          <h3 className="font-semibold text-base leading-relaxed">{thread.title}</h3>
          {thread.text && (
            <p className="text-sm text-muted-foreground truncate mt-1">{thread.text}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-3">
            <span>
              <span
                role="link"
                tabIndex={0}
                className="hover:underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://bsky.app/profile/${thread.authorDid}`, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`https://bsky.app/profile/${thread.authorDid}`, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                @{thread.authorHandle || thread.authorDid}
              </span>
              {" "}· {formatDate(thread.createdAt, locale)}
            </span>
            <span className="ml-auto">{t("thread.comments", { count: thread.commentCount })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

