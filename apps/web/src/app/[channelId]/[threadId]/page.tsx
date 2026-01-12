"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, notFound } from "next/navigation";
import { Loader2, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MentionTextarea, MentionTextareaRef } from "@/components/mention-textarea";
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
import { useAuth, authenticatedFetch } from "@/lib/auth";
import { getHandlesByDids, getDidsByHandles, extractMentions, replaceMentionsWithMap } from "@/lib/bsky";
import { formatDate } from "@/lib/utils";
import { EmojiPickerButton } from "@/components/emoji-picker-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

interface Reactions {
  [emoji: string]: string[]; // emoji -> array of DIDs
}

interface OgpData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface OgpMap {
  [url: string]: OgpData;
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
  cid?: string;
  reactions?: Reactions;
}

interface Comment {
  id: string;
  threadId: string;
  authorDid: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  atUri: string;
  cid?: string;
  reactions?: Reactions;
}

interface ReactionButtonsProps {
  reactions: Reactions;
  userDid?: string;
  onReactionChange: (emoji: string, action: "add" | "remove") => void;
  disabled?: boolean;
}

// Extract URLs from text
function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  // eslint-disable-next-line no-useless-escape
  const urlRegex = /https?:\/\/[^\s<>\[\]()'"]+/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// OGP Card component
function OgpCard({ data }: { data: OgpData }) {
  if (!data.title && !data.description && !data.image) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3 max-w-md border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
    >
      {data.image && (
        <div className="aspect-[1.91/1] bg-muted">
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
      <div className="p-3">
        {data.siteName && (
          <p className="text-xs text-muted-foreground mb-1">{data.siteName}</p>
        )}
        {data.title && (
          <p className="text-sm font-medium line-clamp-2">{data.title}</p>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.description}</p>
        )}
      </div>
    </a>
  );
}

// OGP Cards for text content
function OgpCards({ text, ogpMap }: { text: string | null | undefined; ogpMap: OgpMap }) {
  const urls = extractUrls(text);
  if (urls.length === 0) return null;

  return (
    <>
      {urls.map((url) => {
        const data = ogpMap[url];
        if (!data) return null;
        return <OgpCard key={url} data={data} />;
      })}
    </>
  );
}

function ReactionButtons({ reactions, userDid, onReactionChange, disabled }: ReactionButtonsProps) {
  const entries = Object.entries(reactions).filter(([, dids]) => dids.length > 0);

  if (entries.length === 0 && !userDid) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {entries.map(([emoji, dids]) => {
        const isOwn = userDid ? dids.includes(userDid) : false;
        return (
          <button
            key={emoji}
            onClick={() => !disabled && onReactionChange(emoji, isOwn ? "remove" : "add")}
            disabled={disabled || !userDid}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
              isOwn
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/50 border-transparent hover:bg-muted"
            } ${disabled ? "opacity-50 cursor-not-allowed" : userDid ? "cursor-pointer" : "cursor-default"}`}
          >
            <span>{emoji}</span>
            <span className="text-xs">{dids.length}</span>
          </button>
        );
      })}
    </div>
  );
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
  const [ogpMap, setOgpMap] = useState<OgpMap>({});
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState("");
  const [newCommentPlain, setNewCommentPlain] = useState("");
  const [commentEditorHeight, setCommentEditorHeight] = useState(90);
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
  const [reactionLoading, setReactionLoading] = useState<string | null>(null); // subjectUri being processed
  const toastIdRef = useRef<string | number | null>(null);
  const editorRef = useRef<MentionTextareaRef>(null);

  // Get CID from PDS for a record
  const getCid = async (atUri: string): Promise<string | null> => {
    if (!agent) return null;
    try {
      const parts = atUri.replace("at://", "").split("/");
      const repo = parts[0];
      const collection = parts[1];
      const rkey = parts[2];
      const result = await agent.com.atproto.repo.getRecord({ repo, collection, rkey });
      return result.data.cid || null;
    } catch (error) {
      console.error("Error getting CID:", error);
      return null;
    }
  };

  // Handle adding or removing a reaction
  const handleReaction = async (
    subjectUri: string,
    subjectCid: string,
    emoji: string,
    action: "add" | "remove"
  ) => {
    if (!user || !agent || reactionLoading) return;

    setReactionLoading(subjectUri);
    try {
      if (action === "add") {
        // Create record on PDS
        const record = {
          subject: { uri: subjectUri, cid: subjectCid },
          emoji,
          createdAt: new Date().toISOString(),
        };

        const result = await agent.com.atproto.repo.createRecord({
          repo: user.did,
          collection: "blue.skytalk.talk.reaction",
          record,
        });

        const rkey = result.data.uri.split("/").pop();

        // Save to API
        await authenticatedFetch(`${API_URL}/api/reactions`, user.did, {
          method: "POST",
          body: JSON.stringify({
            id: rkey,
            subjectUri,
            subjectCid,
            emoji,
            atUri: result.data.uri,
          }),
        });

        // Update local state
        if (subjectUri.includes("/blue.skytalk.talk.thread/")) {
          setThread((prev) => {
            if (!prev) return prev;
            const current = prev.reactions || {};
            const dids = current[emoji] || [];
            if (!dids.includes(user.did)) {
              return { ...prev, reactions: { ...current, [emoji]: [...dids, user.did] } };
            }
            return prev;
          });
        } else {
          setComments((prev) =>
            prev.map((c) => {
              if (c.atUri === subjectUri) {
                const current = c.reactions || {};
                const dids = current[emoji] || [];
                if (!dids.includes(user.did)) {
                  return { ...c, reactions: { ...current, [emoji]: [...dids, user.did] } };
                }
              }
              return c;
            })
          );
        }
      } else {
        // Find the reaction to delete
        const res = await fetch(`${API_URL}/api/reactions?subjectUri=${encodeURIComponent(subjectUri)}`);
        if (!res.ok) throw new Error("Failed to fetch reactions");
        const allReactions = await res.json();
        const myReaction = allReactions.find(
          (r: { authorDid: string; emoji: string }) => r.authorDid === user.did && r.emoji === emoji
        );

        if (myReaction) {
          // Delete from PDS
          const rkey = myReaction.atUri.split("/").pop();
          await agent.com.atproto.repo.deleteRecord({
            repo: user.did,
            collection: "blue.skytalk.talk.reaction",
            rkey,
          });

          // Delete from API
          await authenticatedFetch(`${API_URL}/api/reactions/${myReaction.id}`, user.did, {
            method: "DELETE",
          });

          // Update local state
          if (subjectUri.includes("/blue.skytalk.talk.thread/")) {
            setThread((prev) => {
              if (!prev) return prev;
              const current = prev.reactions || {};
              const dids = (current[emoji] || []).filter((d) => d !== user.did);
              const updated = { ...current };
              if (dids.length > 0) {
                updated[emoji] = dids;
              } else {
                delete updated[emoji];
              }
              return { ...prev, reactions: updated };
            });
          } else {
            setComments((prev) =>
              prev.map((c) => {
                if (c.atUri === subjectUri) {
                  const current = c.reactions || {};
                  const dids = (current[emoji] || []).filter((d) => d !== user.did);
                  const updated = { ...current };
                  if (dids.length > 0) {
                    updated[emoji] = dids;
                  } else {
                    delete updated[emoji];
                  }
                  return { ...c, reactions: updated };
                }
                return c;
              })
            );
          }
        }
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
      // Show re-login dialog on error
      setShowLoginModal(true);
    } finally {
      setReactionLoading(null);
    }
  };

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
        setOgpMap(data.ogp || {});
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
    if (!user || !agent || !thread || !newCommentPlain.trim() || posting) return;

    setPosting(true);
    try {
      // Create record on PDS
      const record = {
        threadUri: thread.atUri,
        text: newCommentPlain,
        createdAt: new Date().toISOString(),
      };

      const result = await agent.com.atproto.repo.createRecord({
        repo: user.did,
        collection: "blue.skytalk.talk.comment",
        record,
      });

      // Save to API with AT URI
      await authenticatedFetch(`${API_URL}/api/threads/${threadId}/comments`, user.did, {
        method: "POST",
        body: JSON.stringify({
          text: newCommentPlain,
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
      setNewCommentPlain("");
      editorRef.current?.setContent("");
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
        await authenticatedFetch(`${API_URL}/api/threads/${threadId}`, user.did, {
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
        await authenticatedFetch(`${API_URL}/api/comments/${comment.id}`, user.did, {
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
    const handle = comment.authorHandle || comment.authorDid;
    const quoted = comment.text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const replyText = `@${handle}\n\n${quoted}\n\n`;
    setNewComment(replyText);
    setNewCommentPlain(replyText);
    setCommentTab("write");
    setTimeout(() => {
      editorRef.current?.setContent(replyText);
      editorRef.current?.focus();
    }, 100);
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
              <h2 className="text-xl font-bold mb-2 truncate">
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
                {user && user.did !== thread.authorDid && (
                  <EmojiPickerButton
                    onSelect={async (emoji) => {
                      const cid = thread.cid || await getCid(thread.atUri);
                      if (cid) {
                        handleReaction(thread.atUri, cid, emoji, "add");
                      } else {
                        toast.error(t("reaction.notAvailable"));
                      }
                    }}
                  />
                )}
              </div>
              {thread.text && (
                <div className="prose prose-sm max-w-none mb-4">
                  <Markdown>{thread.text}</Markdown>
                </div>
              )}
              <OgpCards text={thread.text} ogpMap={ogpMap} />
              <a
                href={`https://pdsls.dev/${thread.atUri}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
              >
                {thread.atUri}
              </a>
              <ReactionButtons
                reactions={thread.reactions || {}}
                userDid={user?.did}
                disabled={reactionLoading === thread.atUri}
                onReactionChange={async (emoji, action) => {
                  const cid = thread.cid || await getCid(thread.atUri);
                  if (cid) {
                    handleReaction(thread.atUri, cid, emoji, action);
                  } else {
                    toast.error(t("reaction.notAvailable"));
                  }
                }}
              />
            </CardContent>
          </Card>

          {comments.length > 0 && (
            <Card>
              <CardContent className="py-5 px-5">
                {comments.map((c, index) => (
                  <div
                    key={c.id}
                    id={`comment-${c.id}`}
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
                      {user?.did === c.authorDid && (
                        <button
                          onClick={() =>
                            setDeleteTarget({ type: "comment", item: c })
                          }
                          className="ml-1 p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {user && user.did !== c.authorDid && (
                        <>
                          <button
                            onClick={() => handleReply(c)}
                            className="ml-1 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                            title={t("post.reply")}
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <EmojiPickerButton
                            onSelect={async (emoji) => {
                              const cid = c.cid || await getCid(c.atUri);
                              if (cid) {
                                handleReaction(c.atUri, cid, emoji, "add");
                              } else {
                                toast.error(t("reaction.notAvailable"));
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{c.text}</Markdown>
                    </div>
                    <OgpCards text={c.text} ogpMap={ogpMap} />
                    <a
                      href={`https://pdsls.dev/${c.atUri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
                    >
                      {c.atUri}
                    </a>
                    <ReactionButtons
                      reactions={c.reactions || {}}
                      userDid={user?.did}
                      disabled={reactionLoading === c.atUri}
                      onReactionChange={async (emoji, action) => {
                        const cid = c.cid || await getCid(c.atUri);
                        if (cid) {
                          handleReaction(c.atUri, cid, emoji, action);
                        } else {
                          toast.error(t("reaction.notAvailable"));
                        }
                      }}
                    />
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
                  <MentionTextarea
                    ref={editorRef}
                    value={newComment}
                    onChange={setNewComment}
                    onChangePlainText={setNewCommentPlain}
                    onHeightChange={setCommentEditorHeight}
                    onSubmit={handlePostComment}
                    maxLength={4000}
                    placeholder={t("post.contentPlaceholder")}
                  />
                ) : (
                  <div
                    className="border rounded-md px-3 py-2 overflow-y-auto text-sm"
                    style={{ minHeight: commentEditorHeight }}
                  >
                    {newCommentPlain.trim() ? (
                      <div className="prose prose-sm max-w-none">
                        <Markdown>{newCommentPlain}</Markdown>
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
                    disabled={posting || !newCommentPlain.trim()}
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
