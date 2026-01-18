"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  extractUrls,
  getYouTubeVideoId,
  getBlueskyPostInfo,
  isBlueskyProfileUrl,
  getTwitterPostInfo,
  getSpotifyInfo,
  getAppleMusicInfo,
} from "@/lib/url";
import type { OgpData } from "@/components/url-embeds";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type UrlPreviewItem =
  | { type: "youtube"; url: string; videoId: string }
  | { type: "bluesky"; url: string; handle: string; rkey: string }
  | { type: "twitter"; url: string; tweetId: string }
  | { type: "spotify"; url: string; spotifyType: "track" | "album" | "playlist" | "episode" | "show"; spotifyId: string }
  | { type: "appleMusic"; url: string; appleMusicType: "album" | "playlist" | "song"; region: string; appleMusicId: string; trackId?: string }
  | { type: "ogp"; url: string; data: OgpData };

interface UseUrlPreviewOptions {
  onFirstOgpTitle?: (title: string) => void;
}

interface UseUrlPreviewReturn {
  previews: UrlPreviewItem[];
  handleTextChange: (newText: string, isPaste?: boolean) => void;
  reset: () => void;
}

export function useUrlPreview(
  options: UseUrlPreviewOptions = {}
): UseUrlPreviewReturn {
  const { onFirstOgpTitle } = options;

  const [previews, setPreviews] = useState<UrlPreviewItem[]>([]);
  const previousTextRef = useRef<string>("");
  const fetchedUrlsRef = useRef<Set<string>>(new Set());
  const hasCalledTitleCallbackRef = useRef<boolean>(false);

  const processUrl = useCallback(
    async (url: string) => {
      // Skip if already fetched
      if (fetchedUrlsRef.current.has(url)) return;
      fetchedUrlsRef.current.add(url);

      // Check for YouTube
      const youtubeId = getYouTubeVideoId(url);
      if (youtubeId) {
        setPreviews((prev) => [
          ...prev,
          { type: "youtube", url, videoId: youtubeId },
        ]);
        return;
      }

      // Check for Bluesky post
      const bskyInfo = getBlueskyPostInfo(url);
      if (bskyInfo) {
        setPreviews((prev) => [
          ...prev,
          { type: "bluesky", url, handle: bskyInfo.handle, rkey: bskyInfo.rkey },
        ]);
        return;
      }

      // Skip Bluesky profile URLs
      if (isBlueskyProfileUrl(url)) return;

      // Check for Twitter/X
      const twitterInfo = getTwitterPostInfo(url);
      if (twitterInfo) {
        setPreviews((prev) => [
          ...prev,
          { type: "twitter", url, tweetId: twitterInfo.tweetId },
        ]);
        return;
      }

      // Check for Spotify
      const spotifyInfo = getSpotifyInfo(url);
      if (spotifyInfo) {
        setPreviews((prev) => [
          ...prev,
          { type: "spotify", url, spotifyType: spotifyInfo.type, spotifyId: spotifyInfo.id },
        ]);
        return;
      }

      // Check for Apple Music
      const appleMusicInfo = getAppleMusicInfo(url);
      if (appleMusicInfo) {
        setPreviews((prev) => [
          ...prev,
          {
            type: "appleMusic",
            url,
            appleMusicType: appleMusicInfo.type,
            region: appleMusicInfo.region,
            appleMusicId: appleMusicInfo.id,
            trackId: appleMusicInfo.trackId,
          },
        ]);
        return;
      }

      // Fetch OGP for other URLs
      try {
        const res = await fetch(
          `${API_URL}/api/ogp?url=${encodeURIComponent(url)}`
        );
        if (res.ok) {
          const data: OgpData = await res.json();
          setPreviews((prev) => [...prev, { type: "ogp", url, data }]);

          // Call title callback for first OGP with title
          if (
            data.title &&
            onFirstOgpTitle &&
            !hasCalledTitleCallbackRef.current
          ) {
            hasCalledTitleCallbackRef.current = true;
            onFirstOgpTitle(data.title);
          }
        }
      } catch (error) {
        console.error("Error fetching OGP:", error);
      }
    },
    [onFirstOgpTitle]
  );

  const handleTextChange = useCallback(
    (newText: string, isPaste?: boolean) => {
      const previousText = previousTextRef.current;
      previousTextRef.current = newText;

      const currentUrls = extractUrls(newText);
      const previousUrls = extractUrls(previousText);

      // Find new URLs
      const newUrls = currentUrls.filter((url) => !previousUrls.includes(url));
      if (newUrls.length === 0) return;

      // On paste, process all new URLs immediately
      if (isPaste) {
        newUrls.forEach((url) => processUrl(url));
        return;
      }

      // Otherwise, check if URL is "completed" (has space/newline after it)
      for (const url of newUrls) {
        const urlIndex = newText.lastIndexOf(url);
        if (urlIndex === -1) continue;

        const afterUrl = newText.slice(urlIndex + url.length);
        // URL is completed if followed by whitespace
        if (/^[\s\n]/.test(afterUrl)) {
          processUrl(url);
        }
      }
    },
    [processUrl]
  );

  const reset = useCallback(() => {
    setPreviews([]);
    previousTextRef.current = "";
    fetchedUrlsRef.current.clear();
    hasCalledTitleCallbackRef.current = false;
  }, []);

  // Remove previews for URLs that are no longer in text
  useEffect(() => {
    const currentUrls = new Set(extractUrls(previousTextRef.current));
    setPreviews((prev) => prev.filter((p) => currentUrls.has(p.url)));
  }, []);

  return {
    previews,
    handleTextChange,
    reset,
  };
}
