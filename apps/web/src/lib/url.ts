// Extract URLs from text
export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  // eslint-disable-next-line no-useless-escape
  const urlRegex = /https?:\/\/[^\s<>\[\]()'"]+/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// Extract YouTube video ID from URL
export function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.pathname === "/watch") {
        return urlObj.searchParams.get("v");
      }
      // youtube.com/embed/VIDEO_ID
      if (urlObj.pathname.startsWith("/embed/")) {
        return urlObj.pathname.split("/")[2] || null;
      }
      // youtube.com/shorts/VIDEO_ID
      if (urlObj.pathname.startsWith("/shorts/")) {
        return urlObj.pathname.split("/")[2] || null;
      }
    }

    // youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      return urlObj.pathname.slice(1) || null;
    }

    return null;
  } catch {
    return null;
  }
}

// Extract Bluesky post info from URL
export function getBlueskyPostInfo(
  url: string
): { handle: string; rkey: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // bsky.app/profile/{handle}/post/{rkey}
    if (hostname === "bsky.app") {
      const match = urlObj.pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)/);
      if (match) {
        return { handle: match[1], rkey: match[2] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Check if URL is a Bluesky profile URL (not a post)
export function isBlueskyProfileUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");
    return (
      hostname === "bsky.app" &&
      url.includes("/profile/") &&
      !url.includes("/post/")
    );
  } catch {
    return false;
  }
}

// Extract Twitter/X post info from URL
export function getTwitterPostInfo(
  url: string
): { username: string; tweetId: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // twitter.com/{username}/status/{tweetId} or x.com/{username}/status/{tweetId}
    if (hostname === "twitter.com" || hostname === "x.com") {
      const match = urlObj.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
      if (match) {
        return { username: match[1], tweetId: match[2] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Extract Spotify embed info from URL
export function getSpotifyInfo(
  url: string
): { type: "track" | "album" | "playlist" | "episode" | "show"; id: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // open.spotify.com/{type}/{id}
    if (hostname === "open.spotify.com") {
      const match = urlObj.pathname.match(
        /^\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/
      );
      if (match) {
        return {
          type: match[1] as "track" | "album" | "playlist" | "episode" | "show",
          id: match[2],
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Extract Apple Music embed info from URL
export function getAppleMusicInfo(
  url: string
): { type: "album" | "playlist" | "song"; region: string; id: string; trackId?: string } | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace("www.", "");

    // music.apple.com/{region}/album/{name}/{id}?i={trackId}
    // music.apple.com/{region}/playlist/{name}/{id}
    if (hostname === "music.apple.com") {
      // Album or song (song is album with ?i= param)
      const albumMatch = urlObj.pathname.match(/^\/([a-z]{2})\/album\/[^/]+\/(\d+)/);
      if (albumMatch) {
        const trackId = urlObj.searchParams.get("i");
        return {
          type: trackId ? "song" : "album",
          region: albumMatch[1],
          id: albumMatch[2],
          trackId: trackId || undefined,
        };
      }

      // Playlist
      const playlistMatch = urlObj.pathname.match(
        /^\/([a-z]{2})\/playlist\/[^/]+\/(pl\.[a-zA-Z0-9]+)/
      );
      if (playlistMatch) {
        return {
          type: "playlist",
          region: playlistMatch[1],
          id: playlistMatch[2],
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
