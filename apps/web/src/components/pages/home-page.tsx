"use client";

import Link from "next/link";
import { ThreadCard, Thread } from "@/components/thread-card";

export interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

export interface HomePageProps {
  channels: Channel[];
  threads: Thread[];
  locale: "ja" | "en";
  noRecentText: string;
  seeMoreText: string;
}

export function HomePage({
  channels,
  threads,
  locale,
  noRecentText,
  seeMoreText,
}: HomePageProps) {
  const getChannelName = (channel: Channel) => {
    return locale === "ja" ? channel.nameJa : channel.nameEn;
  };

  const getChannelNameById = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    return channel ? getChannelName(channel) : channelId;
  };

  const getThreadCount = (channelId: string) => {
    return threads.filter((t) => t.channelId === channelId).length;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/${channel.id}`}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            #{getChannelName(channel)} ({getThreadCount(channel.id)})
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-2">
        {threads.length > 0 ? (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              channelName={getChannelNameById(thread.channelId)}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">{noRecentText}</p>
        )}
        {threads.length > 0 && (
          <div className="text-right mt-4">
            <Link href="/all" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {seeMoreText} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
