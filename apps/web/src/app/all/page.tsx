"use client";

import { useEffect, useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ThreadCard, Thread } from "@/components/thread-card";
import { useI18n } from "@/lib/i18n";
import { getHandlesByDids } from "@/lib/bsky";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AllThreadsPage() {
  const { t } = useI18n();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    async function fetchThreads() {
      try {
        const res = await fetch(`${API_URL}/api/threads`);
        if (res.ok) {
          const data = await res.json();
          // Resolve handles from DIDs
          const dids = data.threads.map((t: Thread) => t.authorDid);
          const handleMap = await getHandlesByDids(dids);
          const withHandles = data.threads.map((t: Thread) => ({
            ...t,
            authorHandle: handleMap.get(t.authorDid) || t.authorDid,
          }));
          setThreads(withHandles);
        }
      } catch (error) {
        console.error("Error fetching threads:", error);
      }
    }
    fetchThreads();
  }, []);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: t("thread.all") },
        ]}
        className="mb-6"
      />

      <div className="flex flex-col gap-4">
        {threads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("thread.empty")}
          </p>
        ) : (
          threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))
        )}
      </div>
    </div>
  );
}
