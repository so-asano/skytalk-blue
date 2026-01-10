"use client";

import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ThreadCard, Thread } from "@/components/thread-card";

export interface ChannelPageProps {
  channelName: string;
  threads: Thread[];
  isLoggedIn: boolean;
  texts: {
    top: string;
    newThread: string;
    titlePlaceholder: string;
    write: string;
    preview: string;
    contentPlaceholder: string;
    nothingToPreview: string;
    create: string;
    cancel: string;
    noThreads: string;
  };
  onCreateThread?: (title: string, content: string) => void;
}

export function ChannelPage({
  channelName,
  threads,
  isLoggedIn,
  texts,
  onCreateThread,
}: ChannelPageProps) {
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");

  const handleCreateThread = () => {
    if (!newThreadTitle.trim()) return;
    onCreateThread?.(newThreadTitle, newThreadContent);
    setNewThreadTitle("");
    setNewThreadContent("");
    setShowNewThreadForm(false);
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: texts.top, href: "/" },
          { label: `#${channelName}` },
        ]}
        className="mb-6"
      />

      {isLoggedIn && (
        <div className="mb-6">
          {!showNewThreadForm ? (
            <Button onClick={() => setShowNewThreadForm(true)}>
              {texts.newThread}
            </Button>
          ) : (
            <Card>
              <CardContent className="py-4 space-y-4">
                <Input
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  placeholder={texts.titlePlaceholder}
                />
                <div className="flex border-b">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${contentTab === "write" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                    onClick={() => setContentTab("write")}
                  >
                    {texts.write}
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${contentTab === "preview" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                    onClick={() => setContentTab("preview")}
                  >
                    {texts.preview}
                  </button>
                </div>
                {contentTab === "write" ? (
                  <Textarea
                    value={newThreadContent}
                    onChange={(e) => setNewThreadContent(e.target.value)}
                    className="h-[90px] resize-none"
                    maxLength={4000}
                    placeholder={texts.contentPlaceholder}
                  />
                ) : (
                  <div className="h-[90px] border rounded-lg p-3 overflow-y-auto">
                    {newThreadContent.trim() ? (
                      <div className="prose prose-sm max-w-none">
                        <Markdown>{newThreadContent}</Markdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">{texts.nothingToPreview}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()}>{texts.create}</Button>
                  <Button variant="outline" onClick={() => { setShowNewThreadForm(false); setContentTab("write"); }}>
                    {texts.cancel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {threads.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{texts.noThreads}</p>
        ) : (
          threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} showChannel={false} />
          ))
        )}
      </div>
    </div>
  );
}
