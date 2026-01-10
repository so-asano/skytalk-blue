"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, notFound } from "next/navigation";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThreadCard, Thread } from "@/components/thread-card";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getHandlesByDids } from "@/lib/bsky";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const { t, locale } = useI18n();
  const { user, agent } = useAuth();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [pendingThreads, setPendingThreads] = useState<Thread[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [accordionValue, setAccordionValue] = useState<string>("");
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");
  const [creating, setCreating] = useState(false);
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

  const showNewThreadsRef = useRef(showNewThreads);
  showNewThreadsRef.current = showNewThreads;

  const checkForNewThreads = async () => {
    if (!newestIdRef.current) return;

    try {
      const res = await fetch(`${API_URL}/api/threads?afterId=${newestIdRef.current}&channelId=${channelId}`);
      if (res.ok) {
        const data = await res.json();
        const newThreads = data.threads as Thread[];

        if (newThreads.length > 0) {
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
        const [channelRes, threadsRes] = await Promise.all([
          fetch(`${API_URL}/api/channels/${channelId}`),
          fetch(`${API_URL}/api/threads?channelId=${channelId}`),
        ]);

        if (channelRes.ok) {
          const channelData = await channelRes.json();
          setChannel(channelData);
        } else {
          setIsNotFound(true);
          return;
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
  }, [channelId]);

  // Poll for new threads every 10 seconds (test)
  // useEffect(() => {
  //   const interval = setInterval(checkForNewThreads, 10000);
  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [channelId]);

  // Cleanup toast on unmount only
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  const handleCreateThread = async () => {
    if (!user || !agent || !newThreadTitle.trim() || creating) return;

    setCreating(true);
    try {
      // Create record on PDS
      const record = {
        channelId,
        title: newThreadTitle,
        text: newThreadContent || undefined,
        createdAt: new Date().toISOString(),
      };

      const result = await agent.com.atproto.repo.createRecord({
        repo: user.did,
        collection: "blue.skytalk.talk.thread",
        record,
      });

      // Save to API with AT URI
      await fetch(`${API_URL}/api/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newThreadTitle,
          text: newThreadContent || null,
          channelId,
          authorDid: user.did,
          atUri: result.data.uri,
        }),
      });

      // Fetch fresh data to sync
      const threadsRes = await fetch(`${API_URL}/api/threads?channelId=${channelId}`);
      if (threadsRes.ok) {
        const data = await threadsRes.json();
        const threadsData = data.threads as Thread[];
        newestIdRef.current = data.newestId;
        const dids = threadsData.map((t: Thread) => t.authorDid);
        const handleMap = await getHandlesByDids(dids);
        const withHandles = threadsData.map((t: Thread) => ({
          ...t,
          authorHandle: handleMap.get(t.authorDid) || t.authorDid,
        }));
        setThreads(withHandles);
      }

      setNewThreadTitle("");
      setNewThreadContent("");
      setAccordionValue("");
    } catch (error) {
      console.error("Error creating thread:", error);
    } finally {
      setCreating(false);
    }
  };

  const channelName = channel
    ? locale === "ja" ? channel.nameJa : channel.nameEn
    : channelId;

  if (isNotFound) {
    notFound();
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: `#${channelName}` },
        ]}
        className="mb-6"
      />

      {user && (
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="mb-6"
        >
          <AccordionItem value="new-thread" className="bg-card rounded-xl border shadow-sm px-5">
            <AccordionTrigger className="hover:no-underline cursor-pointer">
              {t("thread.new")}
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Input
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
                placeholder={t("thread.titlePlaceholder")}
              />
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium ${contentTab === "write" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                  onClick={() => setContentTab("write")}
                >
                  {t("post.write")}
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${contentTab === "preview" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                  onClick={() => setContentTab("preview")}
                >
                  {t("post.preview")}
                </button>
              </div>
              {contentTab === "write" ? (
                <Textarea
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  className="h-[90px] resize-none"
                  maxLength={4000}
                  placeholder={t("post.contentPlaceholder")}
                />
              ) : (
                <div className="h-[90px] border rounded-md px-3 py-2 overflow-y-auto text-sm">
                  {newThreadContent.trim() ? (
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{newThreadContent}</Markdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t("post.nothingToPreview")}</p>
                  )}
                </div>
              )}
              <div className="flex">
                <Button onClick={handleCreateThread} disabled={creating || !newThreadTitle.trim()}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.create")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("thread.noThreads")}</p>
        ) : (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              showChannel={false}
              highlighted={highlightedIds.has(thread.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
