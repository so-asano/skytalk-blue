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
