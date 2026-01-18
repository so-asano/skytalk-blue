"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, notFound } from "next/navigation";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip, X } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MentionTextarea } from "@/components/mention-textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThreadCard, Thread } from "@/components/thread-card";
import { RecordButton } from "@/components/record-button";
import { AudioPlayer } from "@/components/audio-player";
import { UrlPreviews } from "@/components/url-embeds";
import { MentionTextareaRef } from "@/components/mention-textarea";
import { useI18n } from "@/lib/i18n";
import { useAuth, authenticatedFetch } from "@/lib/auth";
import { getHandlesByDids } from "@/lib/bsky";
import { useUrlPreview } from "@/hooks/useUrlPreview";

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
  const [newThreadContentPlain, setNewThreadContentPlain] = useState("");
  const [editorHeight, setEditorHeight] = useState(90);
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");
  const [creating, setCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isTranscribed, setIsTranscribed] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const newestIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MentionTextareaRef>(null);

  const {
    previews: urlPreviews,
    handleTextChange: handleUrlTextChange,
    reset: resetUrlPreview,
  } = useUrlPreview({
    onFirstOgpTitle: (title) => {
      if (!newThreadTitle.trim()) {
        setNewThreadTitle(title);
      }
    },
  });

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/mp4",
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const processFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("post.invalidFileType"));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("post.fileTooLarge"));
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("audio/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (isTranscribed) {
      setIsTranscribed(false);
      setNewThreadContent("");
      setNewThreadContentPlain("");
      editorRef.current?.setContent("");
    }
  };

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
      const res = await fetch(
        `${API_URL}/api/threads?afterId=${newestIdRef.current}&channelId=${channelId}`
      );
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
    if (
      !user ||
      !agent ||
      !newThreadTitle.trim() ||
      !newThreadContentPlain.trim() ||
      creating
    )
      return;

    setCreating(true);
    try {
      // Upload blob if selected
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let blobs: any[] = [];
      let blobsForApi: Array<{
        ref: { $link: string };
        mimeType: string;
        size: number;
      }> = [];
      if (selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const uploadResult = await agent.uploadBlob(uint8Array, {
          encoding: selectedFile.type,
        });
        // Use the raw BlobRef for PDS record
        blobs = [uploadResult.data.blob];
        // Store serialized version for our API
        blobsForApi = [
          {
            ref: { $link: uploadResult.data.blob.ref.toString() },
            mimeType: selectedFile.type,
            size: selectedFile.size,
          },
        ];
      }

      // Create record on PDS
      const record: {
        channelId: string;
        title: string;
        text?: string;
        createdAt: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blobs?: any[];
      } = {
        channelId,
        title: newThreadTitle,
        text: newThreadContentPlain || undefined,
        createdAt: new Date().toISOString(),
      };
      if (blobs.length > 0) {
        record.blobs = blobs;
      }

      const result = await agent.com.atproto.repo.createRecord({
        repo: user.did,
        collection: "blue.skytalk.talk.thread",
        record,
      });

      // Save to API with AT URI
      await authenticatedFetch(`${API_URL}/api/threads`, user.did, {
        method: "POST",
        body: JSON.stringify({
          title: newThreadTitle,
          text: newThreadContentPlain || null,
          channelId,
          authorDid: user.did,
          atUri: result.data.uri,
          blobs: blobsForApi,
        }),
      });

      // Fetch fresh data to sync
      const threadsRes = await fetch(
        `${API_URL}/api/threads?channelId=${channelId}`
      );
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
      setNewThreadContentPlain("");
      setAccordionValue("");
      resetUrlPreview();
      handleRemoveFile();
    } catch (error) {
      console.error("Error creating thread:", error);
    } finally {
      setCreating(false);
    }
  };

  const channelName = channel
    ? locale === "ja"
      ? channel.nameJa
      : channel.nameEn
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
          <AccordionItem
            value="new-thread"
            className="bg-card rounded-xl border shadow-sm px-5"
          >
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
                  className={`px-4 py-2 text-sm font-medium ${
                    contentTab === "write"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setContentTab("write")}
                >
                  {t("post.write")}
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    contentTab === "preview"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setContentTab("preview")}
                >
                  {t("post.preview")}
                </button>
              </div>
              {contentTab === "write" ? (
                <MentionTextarea
                  ref={editorRef}
                  value={newThreadContent}
                  onChange={setNewThreadContent}
                  onChangePlainText={(text, isPaste) => {
                    setNewThreadContentPlain(text);
                    handleUrlTextChange(text, isPaste);
                  }}
                  onHeightChange={setEditorHeight}
                  onSubmit={handleCreateThread}
                  maxLength={4000}
                  placeholder={t("post.contentPlaceholder")}
                  disabled={isTranscribed}
                />
              ) : (
                <div
                  className="border rounded-md px-3 py-2 overflow-y-auto text-sm"
                  style={{ minHeight: editorHeight }}
                >
                  {newThreadContentPlain.trim() ? (
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{newThreadContentPlain}</Markdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {t("post.nothingToPreview")}
                    </p>
                  )}
                </div>
              )}
              <UrlPreviews previews={urlPreviews} />
              {selectedFile && (
                <div className="p-2 bg-muted/50 rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedFile.type.startsWith("image/") && filePreview ? (
                      <img
                        src={filePreview}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : !selectedFile.type.startsWith("audio/") ? (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        {selectedFile.type.split("/")[1]}
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedFile.type.startsWith("audio/") && filePreview && (
                    <AudioPlayer
                      src={filePreview}
                      mimeType={selectedFile.type}
                      className="w-full"
                    />
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateThread}
                  disabled={
                    creating ||
                    !newThreadTitle.trim() ||
                    !newThreadContentPlain.trim()
                  }
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("common.create")
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/m4a"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={creating}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <RecordButton
                  onRecordingStart={() => {
                    setNewThreadContent("");
                    setNewThreadContentPlain("");
                    editorRef.current?.setContent("");
                    setIsTranscribed(true);
                  }}
                  onRecordingComplete={(file) => {
                    processFile(file);
                  }}
                  onTranscript={(text) => {
                    setNewThreadContent(text);
                    setNewThreadContentPlain(text);
                    editorRef.current?.setContent(text);
                  }}
                  disabled={creating}
                />
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
          <p className="text-muted-foreground text-center py-8">
            {t("thread.noThreads")}
          </p>
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
