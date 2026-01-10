"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface ThreadData {
  id: string;
  title: string;
  text: string | null;
  createdAt: string;
  authorDid: string;
  authorHandle?: string;
}

export interface CommentData {
  id: string;
  authorDid: string;
  authorHandle?: string;
  text: string;
  createdAt: string;
  atUri: string;
}

export interface ThreadPageProps {
  channelId: string;
  channelName: string;
  thread: ThreadData;
  comments: CommentData[];
  isLoggedIn: boolean;
  posting?: boolean;
  locale: "ja" | "en";
  texts: {
    top: string;
    write: string;
    preview: string;
    contentPlaceholder: string;
    nothingToPreview: string;
    submit: string;
    loginRequired: string;
  };
  onPostComment?: (text: string) => void;
  onLoginClick?: () => void;
}

export function ThreadPage({
  channelId,
  channelName,
  thread,
  comments,
  isLoggedIn,
  posting = false,
  locale,
  texts,
  onPostComment,
  onLoginClick,
}: ThreadPageProps) {
  const [newComment, setNewComment] = useState("");
  const [commentTab, setCommentTab] = useState<"write" | "preview">("write");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    const days = locale === "ja"
      ? ["日", "月", "火", "水", "木", "金", "土"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${yyyy}/${mm}/${dd}(${days[d.getDay()]}) ${hh}:${mi}:${ss}`;
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onPostComment?.(newComment);
    setNewComment("");
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: texts.top, href: "/" },
          { label: `#${channelName}`, href: `/${channelId}` },
          { label: thread.title },
        ]}
        className="mb-6"
      />

      <Card className="mb-4">
        <CardContent className="py-5 px-5">
          <h2 className="text-xl font-bold leading-relaxed mb-2">{thread.title}</h2>
          <div className="text-sm text-muted-foreground mb-3">
            <a
              href={`https://bsky.app/profile/${thread.authorDid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @{thread.authorHandle || thread.authorDid}
            </a>
            {" "}· {formatDate(thread.createdAt)}
          </div>
          {thread.text && (
            <div className="prose prose-sm max-w-none mb-4">
              <Markdown>{thread.text}</Markdown>
            </div>
          )}
          <a
            href={`https://pdsls.dev/at://${thread.authorDid}/blue.skytalk.talk.thread/${thread.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[10px] text-muted-foreground/40 font-mono truncate hover:underline"
          >
            at://{thread.authorDid}/blue.skytalk.talk.thread/{thread.id}
          </a>
        </CardContent>
      </Card>

      {comments.length > 0 && (
        <Card>
          <CardContent className="py-5 px-5">
            {comments.map((c, index) => (
              <div key={c.id}>
                {index > 0 && <Separator className="my-6" />}
                <div className="text-sm text-muted-foreground mb-3">
                  <a
                    href={`https://bsky.app/profile/${c.authorDid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    @{c.authorHandle || c.authorDid}
                  </a>
                  {" "}· {formatDate(c.createdAt)}
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

      {isLoggedIn ? (
        <Card className="mt-8">
          <CardContent className="py-4 space-y-4">
            <div className="flex border-b">
              <button
                className={`px-4 py-2 text-sm font-medium ${commentTab === "write" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => setCommentTab("write")}
              >
                {texts.write}
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${commentTab === "preview" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                onClick={() => setCommentTab("preview")}
              >
                {texts.preview}
              </button>
            </div>
            {commentTab === "write" ? (
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="h-[90px] resize-none"
                maxLength={4000}
                placeholder={texts.contentPlaceholder}
              />
            ) : (
              <div className="h-[90px] border rounded-lg p-3 overflow-y-auto">
                {newComment.trim() ? (
                  <div className="prose prose-sm max-w-none">
                    <Markdown>{newComment}</Markdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{texts.nothingToPreview}</p>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={posting || !newComment.trim()}>
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : texts.submit}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8">
          <CardContent className="py-6 text-center text-muted-foreground">
            <button
              onClick={onLoginClick}
              className="underline hover:text-foreground"
            >
              {texts.loginRequired}
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
