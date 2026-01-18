"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getDidsByHandles } from "@/lib/bsky";
import type { UrlPreviewItem } from "@/hooks/useUrlPreview";

export interface OgpData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

// OGP Card component
export function OgpCard({ data }: { data: OgpData }) {
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
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

// YouTube Embed component
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="mt-3 max-w-md">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}

// Bluesky Embed component
export function BlueskyEmbed({
  handle,
  rkey,
}: {
  handle: string;
  rkey: string;
}) {
  const [did, setDid] = useState<string | null>(
    handle.startsWith("did:") ? handle : null
  );
  const [height, setHeight] = useState(200);
  const embedId = `bsky-${did}-${rkey}`;

  useEffect(() => {
    // Resolve handle to DID if needed
    if (!handle.startsWith("did:")) {
      getDidsByHandles([handle]).then((map) => {
        const resolvedDid = map.get(handle);
        if (resolvedDid) {
          setDid(resolvedDid);
        }
      });
    }
  }, [handle]);

  useEffect(() => {
    // Listen for height messages from the embed iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://embed.bsky.app") return;
      const data = event.data;
      // Bluesky embed sends { id, height }
      if (data?.id === embedId && typeof data?.height === "number") {
        setHeight(data.height + 2); // Add small buffer
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [embedId]);

  if (!did) {
    return (
      <div className="mt-3 max-w-md border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading Bluesky post...</span>
        </div>
      </div>
    );
  }

  const embedUrl = `https://embed.bsky.app/embed/${did}/app.bsky.feed.post/${rkey}?id=${embedId}`;

  return (
    <div className="mt-3 max-w-md">
      <iframe
        data-bluesky-id={embedId}
        src={embedUrl}
        width="100%"
        frameBorder={0}
        scrolling="no"
        className="border-none block"
        style={{ height }}
        title="Bluesky post"
      />
    </div>
  );
}

// URL Previews container component
export function UrlPreviews({ previews }: { previews: UrlPreviewItem[] }) {
  if (previews.length === 0) return null;

  return (
    <div className="space-y-2">
      {previews.map((preview) => {
        if (preview.type === "youtube") {
          return <YouTubeEmbed key={preview.url} videoId={preview.videoId} />;
        }
        if (preview.type === "bluesky") {
          return (
            <BlueskyEmbed
              key={preview.url}
              handle={preview.handle}
              rkey={preview.rkey}
            />
          );
        }
        if (preview.type === "ogp") {
          return <OgpCard key={preview.url} data={preview.data} />;
        }
        return null;
      })}
    </div>
  );
}
