"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, notFound } from "next/navigation";
import { Loader2, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getHandlesByDids, getDidsByHandles, extractMentions, replaceMentionsWithMap } from "@/lib/bsky";
import { formatDate } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

interface Thread {
  id: string;
  channelId: string;
  title: string;
  text: string | null;
  createdAt: string;
  authorDid: string;
  authorHandle?: string;
  commentCount: number;
  atUri: string;
}

interface Comment {
  id: string;
  threadId: string;
  authorDid: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  atUri: string;
}

export default function ThreadPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const threadId = params.threadId as string;
  const { t, locale } = useI18n();
  const { user, agent, login } = useAuth();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState("");
  const [commentTab, setCommentTab] = useState<"write" | "preview">("write");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginHandle, setLoginHandle] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "thread" | "comment";
    item?: Comment;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleLogin = async () => {
    if (!loginHandle.trim()) return;
    const handle = loginHandle.includes(".")
      ? loginHandle
      : `${loginHandle}.bsky.social`;

    setLoginLoading(true);
    try {
      await login(handle, locale);
    } catch {
      setLoginLoading(false);
    }
  };

  const showNewComments = () => {
    if (pendingComments.length === 0) return;

    // Add pending comments and highlight them
    const newIds = new Set(pendingComments.map((c) => c.id));
    setHighlightedIds(newIds);
    setComments((prev) => [...prev, ...pendingComments]);
    setPendingComments([]);

    // Dismiss toast
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedIds(new Set());
    }, 3000);
  };

  const checkForNewComments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/threads/${threadId}`);
      if (res.ok) {
        const data = await res.json();
        const currentIds = new Set(comments.map((c) => c.id));
        const pendingIds = new Set(pendingComments.map((c) => c.id));
        const newComments = (data.comments as Comment[]).filter(
          (c) => !currentIds.has(c.id) && !pendingIds.has(c.id)
        );

        if (newComments.length > 0) {
          setPendingComments((prev) => [...prev, ...newComments]);
          const total = pendingComments.length + newComments.length;

          // Show or update toast
          if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
          }
          toastIdRef.current = toast(
            t("thread.newComments").replace("{count}", String(total)),
            {
              duration: Infinity,
              action: {
                label: t("thread.showNewComments"),
                onClick: showNewComments,
              },
            }
          );
        }
      }
    } catch (error) {
      console.error("Error checking for new comments:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [channelRes, threadRes] = await Promise.all([
          fetch(`${API_URL}/api/channels/${channelId}`),
          fetch(`${API_URL}/api/threads/${threadId}`),
        ]);

        if (!channelRes.ok || !threadRes.ok) {
          setIsNotFound(true);
          return;
        }

        const channelData = await channelRes.json();
        setChannel(channelData);

        const data = await threadRes.json();
        // Resolve handles from DIDs
        const allDids = [
          data.thread.authorDid,
          ...data.comments.map((c: Comment) => c.authorDid),
        ];
        const handleMap = await getHandlesByDids(allDids);

        // Collect all mentions from thread and comments, then resolve in one batch
        const allTexts = [
          data.thread.text,
          ...data.comments.map((c: Comment) => c.text),
        ].filter(Boolean) as string[];
        const allMentions = allTexts.flatMap(extractMentions);
        const mentionDidMap = allMentions.length > 0
          ? await getDidsByHandles(allMentions)
          : new Map<string, string>();

        // Replace mentions using the batched map
        const resolvedThreadText = data.thread.text
          ? replaceMentionsWithMap(data.thread.text, mentionDidMap)
          : null;
        const resolvedComments = data.comments.map((c: Comment) => ({
          ...c,
          authorHandle: handleMap.get(c.authorDid) || c.authorDid,
          text: replaceMentionsWithMap(c.text, mentionDidMap),
        }));

        setThread({
          ...data.thread,
          text: resolvedThreadText,
          authorHandle:
            handleMap.get(data.thread.authorDid) || data.thread.authorDid,
        });
        setComments(resolvedComments);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, [channelId, threadId]);

  // Poll for new comments every 10 seconds (test)
  // useEffect(() => {
  //   const interval = setInterval(checkForNewComments, 10000);
  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [threadId]);

  // Cleanup toast on unmount only
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  const handlePostComment = async () => {
    if (!user || !agent || !thread || !newComment.trim() || posting) return;

    setPosting(true);
    try {
      // Create record on PDS
      const record = {
        threadUri: thread.atUri,
        text: newComment,
        createdAt: new Date().toISOString(),
      };

      const result = await agent.com.atproto.repo.createRecord({
        repo: user.did,
        collection: "blue.skytalk.talk.comment",
        record,
      });

      // Save to API with AT URI
      await fetch(`${API_URL}/api/threads/${threadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newComment,
          authorDid: user.did,
          atUri: result.data.uri,
        }),
      });

      // Fetch fresh data to sync
      const threadRes = await fetch(`${API_URL}/api/threads/${threadId}`);
      if (threadRes.ok) {
        const data = await threadRes.json();
        const dids = data.comments.map((c: Comment) => c.authorDid);
        const handleMap = await getHandlesByDids(dids);

        // Batch resolve mentions
        const allMentions = data.comments.flatMap((c: Comment) => extractMentions(c.text));
        const mentionDidMap = allMentions.length > 0
          ? await getDidsByHandles(allMentions)
          : new Map<string, string>();

        setComments(
          data.comments.map((c: Comment) => ({
            ...c,
            authorHandle: handleMap.get(c.authorDid) || c.authorDid,
            text: replaceMentionsWithMap(c.text, mentionDidMap),
          }))
        );
      }

      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !agent || !deleteTarget) return;

    setDeleting(true);
    try {
      if (deleteTarget.type === "thread" && thread) {
        // Delete from PDS
        const uri = thread.atUri;
        const parts = uri.replace("at://", "").split("/");
        const rkey = parts[2];

        await agent.com.atproto.repo.deleteRecord({
          repo: user.did,
          collection: "blue.skytalk.talk.thread",
          rkey,
        });

        // Delete from API (soft delete)
        await fetch(`${API_URL}/api/threads/${threadId}`, {
          method: "DELETE",
        });

        // Close modal and redirect to channel page
        setDeleting(false);
        setDeleteTarget(null);
        window.location.href = `/${channelId}`;
        return;
      } else if (deleteTarget.type === "comment" && deleteTarget.item) {
        const comment = deleteTarget.item;
        // Delete from PDS
        const uri = comment.atUri;
        const parts = uri.replace("at://", "").split("/");
        const rkey = parts[2];

        await agent.com.atproto.repo.deleteRecord({
          repo: user.did,
          collection: "blue.skytalk.talk.comment",
          rkey,
        });

        // Delete from API (soft delete)
        await fetch(`${API_URL}/api/comments/${comment.id}`, {
          method: "DELETE",
        });

        // Remove from local state
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    const quoted = comment.text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    setNewComment(quoted + "\n\n");
    setCommentTab("write");
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }, 0);
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
          { label: `#${channelName}`, href: `/${channelId}` },
          { label: thread?.title || "..." },
        ]}
        className="mb-6"
      />

      {thread && (
        <div className="flex flex-col gap-4">
          <Card>
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
                >
                  @{thread.authorHandle || thread.authorDid}
                </a>
                <span>· {formatDate(thread.createdAt, locale)}</span>
                {user?.did === thread.authorDid && (
                  <button
                    onClick={() => setDeleteTarget({ type: "thread" })}
                    className="ml-1 p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                    title={t("common.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
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
              >
                {thread.atUri}
              </a>
            </CardContent>
          </Card>

          {comments.length > 0 && (
            <Card>
              <CardContent className="py-5 px-5">
                {comments.map((c, index) => (
                  <div
                    key={c.id}
                    className={
                      highlightedIds.has(c.id)
                        ? "bg-primary/10 -mx-3 px-3 py-2 rounded-lg transition-colors duration-1000"
                        : ""
                    }
                  >
                    {index > 0 && <Separator className="my-6" />}
                    <div className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                      <a
                        href={`https://bsky.app/profile/${c.authorDid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        @{c.authorHandle || c.authorDid}
                      </a>
                      <span>· {formatDate(c.createdAt, locale)}</span>
                      {user?.did === c.authorDid ? (
                        <button
                          onClick={() =>
                            setDeleteTarget({ type: "comment", item: c })
                          }
                          className="ml-1 p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : user && (
                        <button
                          onClick={() => handleReply(c)}
                          className="ml-1 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                          title={t("post.reply")}
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{c.text}</Markdown>
                    </div>
                    <a
                      href={`https://pdsls.dev/${c.atUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
                    >
                      {c.atUri}
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {user ? (
            <Card>
              <CardContent className="py-4 space-y-4">
                <div className="flex border-b">
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      commentTab === "write"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setCommentTab("write")}
                  >
                    {t("post.write")}
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium ${
                      commentTab === "preview"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setCommentTab("preview")}
                  >
                    {t("post.preview")}
                  </button>
                </div>
                {commentTab === "write" ? (
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    className="h-[90px] resize-none"
                    maxLength={4000}
                    placeholder={t("post.contentPlaceholder")}
                  />
                ) : (
                  <div className="h-[90px] border rounded-md px-3 py-2 overflow-y-auto text-sm">
                    {newComment.trim() ? (
                      <div className="prose prose-sm max-w-none">
                        <Markdown>{newComment}</Markdown>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {t("post.nothingToPreview")}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-start">
                  <Button
                    onClick={handlePostComment}
                    disabled={posting || !newComment.trim()}
                  >
                    {posting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>{t("post.submit")}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {t("auth.loginRequiredPrefix")}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="underline hover:text-foreground"
                >
                  {t("auth.loginRequiredLink")}
                </button>
                {t("auth.loginRequiredSuffix")}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog
        open={showLoginModal}
        onOpenChange={(open) => {
          setShowLoginModal(open);
          if (!open) {
            setLoginHandle("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.loginTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex">
              <Input
                value={loginHandle}
                onChange={(e) => setLoginHandle(e.target.value)}
                placeholder={t("auth.handlePlaceholder")}
                onKeyDown={(e) =>
                  e.key === "Enter" && !loginLoading && handleLogin()
                }
                disabled={loginLoading}
                className="flex-1 rounded-r-none border-r-0"
              />
              <Button
                onClick={handleLogin}
                disabled={loginLoading}
                className="rounded-l-none"
              >
                {loginLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("common.login")
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.noAccount")}
              <a
                href="https://bsky.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground ml-1"
              >
                {t("auth.createAccount")}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.delete")}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "thread"
                ? t("thread.confirmDelete")
                : t("thread.confirmDeleteComment")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
