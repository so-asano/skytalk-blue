import * as cheerio from "cheerio";

export interface OgpData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

// In-memory cache with TTL
const cache = new Map<string, { data: OgpData; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

// Extract URLs from text
export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>\[\]()'"]+/g;
  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)];
}

// Fetch OGP data for a single URL
async function fetchOgp(url: string): Promise<OgpData> {
  const defaultData: OgpData = {
    url,
    title: null,
    description: null,
    image: null,
    siteName: null,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SkyTalkBot/1.0)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return defaultData;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return defaultData;

    const html = await res.text();
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const ogSiteName = $('meta[property="og:site_name"]').attr("content");

    // Fallback to standard meta tags
    const title = ogTitle || $("title").text() || null;
    const description = ogDescription || $('meta[name="description"]').attr("content") || null;

    return {
      url,
      title: title?.slice(0, 200) || null,
      description: description?.slice(0, 500) || null,
      image: ogImage || null,
      siteName: ogSiteName || null,
    };
  } catch {
    return defaultData;
  }
}

// Get OGP data with caching
export async function getOgp(url: string): Promise<OgpData> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await fetchOgp(url);
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

// Get OGP data for multiple URLs
export async function getOgpBatch(urls: string[]): Promise<Record<string, OgpData>> {
  const uniqueUrls = [...new Set(urls)];
  const results: Record<string, OgpData> = {};

  // Fetch in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(getOgp));
    batch.forEach((url, idx) => {
      results[url] = batchResults[idx];
    });
  }

  return results;
}
