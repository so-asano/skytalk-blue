"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { ThreadCard, Thread } from "@/components/thread-card";
import { useI18n } from "@/lib/i18n";
import { getHandlesByDids } from "@/lib/bsky";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

export default function Home() {
  const { t, locale } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pendingThreads, setPendingThreads] = useState<Thread[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAllChannels, setShowAllChannels] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const newestIdRef = useRef<string | null>(null);

  const showNewThreads = () => {
    if (pendingThreads.length === 0) return;

    const newIds = new Set(pendingThreads.map((t) => t.id));
    setHighlightedIds(newIds);
    setThreads((prev) => [...pendingThreads, ...prev]);
    setPendingThreads([]);

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    setTimeout(() => {
      setHighlightedIds(new Set());
    }, 3000);
  };

  // Stable reference for showNewThreads
  const showNewThreadsRef = useRef(showNewThreads);
  showNewThreadsRef.current = showNewThreads;

  const checkForNewThreads = async () => {
    if (!newestIdRef.current) return;

    try {
      const res = await fetch(`${API_URL}/api/threads?afterId=${newestIdRef.current}`);
      if (res.ok) {
        const data = await res.json();
        const newThreads = data.threads as Thread[];

        if (newThreads.length > 0) {
          // Update newestId
          newestIdRef.current = data.newestId;

          const dids = newThreads.map((t: Thread) => t.authorDid);
          const handleMap = await getHandlesByDids(dids);
          const withHandles = newThreads.map((t: Thread) => ({
            ...t,
            authorHandle: handleMap.get(t.authorDid) || t.authorDid,
          }));

          setPendingThreads((prev) => {
            const updated = [...withHandles, ...prev];
            const total = updated.length;

            if (toastIdRef.current) {
              toast.dismiss(toastIdRef.current);
            }
            toastIdRef.current = toast(
              t("thread.newThreads").replace("{count}", String(total)),
              {
                duration: Infinity,
                action: {
                  label: t("thread.showNewThreads"),
                  onClick: () => showNewThreadsRef.current(),
                },
              }
            );

            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error checking for new threads:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [channelsRes, threadsRes] = await Promise.all([
          fetch(`${API_URL}/api/channels`),
          fetch(`${API_URL}/api/threads`),
        ]);
        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          if (Array.isArray(channelsData)) {
            setChannels(channelsData);
          }
        }
        if (threadsRes.ok) {
          const data = await threadsRes.json();
          const threadsData = data.threads as Thread[];
          newestIdRef.current = data.newestId;

          // Resolve handles from DIDs
          const dids = threadsData.map((t: Thread) => t.authorDid);
          const handleMap = await getHandlesByDids(dids);
          const withHandles = threadsData.map((t: Thread) => ({
            ...t,
            authorHandle: handleMap.get(t.authorDid) || t.authorDid,
          }));
          setThreads(withHandles);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Poll for new threads every 10 seconds (test)
  useEffect(() => {
    const interval = setInterval(checkForNewThreads, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Cleanup toast on unmount only
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

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

  // Sort channels by thread count (desc), then by id (asc for stable sort)
  const sortedChannels = [...channels].sort((a, b) => {
    const countDiff = getThreadCount(b.id) - getThreadCount(a.id);
    if (countDiff !== 0) return countDiff;
    return a.id.localeCompare(b.id);
  });

  // Filter channels with threads > 0, or show first 5 if all are 0
  const channelsWithThreads = sortedChannels.filter((c) => getThreadCount(c.id) > 0);
  const displayChannels = channelsWithThreads.length > 0
    ? channelsWithThreads
    : sortedChannels.slice(0, 5);

  // Check if there are hidden channels
  const hasHiddenChannels = !showAllChannels && sortedChannels.length > displayChannels.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(showAllChannels ? sortedChannels : displayChannels).map((channel) => (
          <Link
            key={channel.id}
            href={`/${channel.id}`}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            #{getChannelName(channel)} ({getThreadCount(channel.id)})
          </Link>
        ))}
        {hasHiddenChannels && (
          <button
            onClick={() => setShowAllChannels(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {t("channel.showMore")}
          </button>
        )}
        {showAllChannels && sortedChannels.length > displayChannels.length && (
          <button
            onClick={() => setShowAllChannels(false)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            {t("channel.showLess")}
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {threads.length > 0 ? (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              channelName={getChannelNameById(thread.channelId)}
              highlighted={highlightedIds.has(thread.id)}
            />
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">{t("thread.noRecent")}</p>
        )}
        {threads.length > 0 && (
          <div className="text-right mt-4">
            <Link href="/all" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("thread.seeMore")} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
