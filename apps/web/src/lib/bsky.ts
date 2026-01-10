const BSKY_PUBLIC_API = "https://public.api.bsky.app/xrpc";

async function fetchProfiles(dids: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (dids.length === 0) return results;

  try {
    const params = new URLSearchParams();
    dids.forEach((did) => params.append("actors", did));

    const res = await fetch(`${BSKY_PUBLIC_API}/app.bsky.actor.getProfiles?${params}`);
    if (!res.ok) return results;

    const data = await res.json();
    for (const profile of data.profiles || []) {
      if (profile.did && profile.handle) {
        results.set(profile.did, profile.handle);
      }
    }
  } catch {
    // Ignore errors
  }

  return results;
}

export async function getHandleByDid(did: string): Promise<string | null> {
  const results = await fetchProfiles([did]);
  return results.get(did) || null;
}

export async function getProfile(actor: string): Promise<{ did: string; handle: string } | null> {
  try {
    const res = await fetch(`${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.did && data.handle) {
      return { did: data.did, handle: data.handle };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export async function getHandlesByDids(
  dids: string[],
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<Map<string, string>> {
  const { batchSize = 25, concurrency = 10 } = options;
  const results = new Map<string, string>();

  // Remove duplicates
  const uniqueDids = [...new Set(dids)];

  // Split into batches of 25 (API limit)
  const batches: string[][] = [];
  for (let i = 0; i < uniqueDids.length; i += batchSize) {
    batches.push(uniqueDids.slice(i, i + batchSize));
  }

  // Process batches with concurrency limit (10 parallel requests)
  for (let i = 0; i < batches.length; i += concurrency) {
    const currentBatches = batches.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      currentBatches.map((batch) => fetchProfiles(batch))
    );

    for (const batchResult of batchResults) {
      for (const [did, handle] of batchResult) {
        results.set(did, handle);
      }
    }
  }

  return results;
}

export async function getDidsByHandles(handles: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  if (handles.length === 0) return results;

  const uniqueHandles = [...new Set(handles)];
  const batchSize = 25;

  for (let i = 0; i < uniqueHandles.length; i += batchSize) {
    const batch = uniqueHandles.slice(i, i + batchSize);
    try {
      const params = new URLSearchParams();
      batch.forEach((handle) => params.append("actors", handle));

      const res = await fetch(`${BSKY_PUBLIC_API}/app.bsky.actor.getProfiles?${params}`);
      if (!res.ok) continue;

      const data = await res.json();
      for (const profile of data.profiles || []) {
        if (profile.did && profile.handle) {
          results.set(profile.handle, profile.did);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return results;
}

// Extract @mentions from text, excluding code blocks and quotes
export function extractMentions(text: string): string[] {
  const mentions: string[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.trim().startsWith(">")) continue;

    // Match @handle patterns (handle must contain a dot for domain)
    const matches = line.matchAll(/@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g);
    for (const match of matches) {
      mentions.push(match[0].slice(1)); // Remove @ prefix
    }
  }

  return [...new Set(mentions)];
}

// Replace @mentions in text using a pre-built handle->did map
export function replaceMentionsWithMap(text: string, didMap: Map<string, string>): string {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return text;

  const lines = text.split("\n");
  let inCodeBlock = false;
  const processedLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line);
      continue;
    }
    if (inCodeBlock || line.trim().startsWith(">")) {
      processedLines.push(line);
      continue;
    }

    let processedLine = line;
    for (const handle of mentions) {
      const did = didMap.get(handle);
      if (did) {
        const regex = new RegExp(`@${handle.replace(/\./g, "\\.")}(?![\\w.-])`, "g");
        processedLine = processedLine.replace(regex, `[@${handle}](https://bsky.app/profile/${did})`);
      }
    }
    processedLines.push(processedLine);
  }

  return processedLines.join("\n");
}

// Resolve @mentions in text to [@handle](url) links
export async function resolveMentions(text: string): Promise<string> {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return text;

  const didMap = await getDidsByHandles(mentions);
  return replaceMentionsWithMap(text, didMap);
}

export async function resolveHandles<T extends { authorDid: string; authorHandle?: string }>(
  items: T[]
): Promise<T[]> {
  const didsToResolve = items
    .filter((item) => !item.authorHandle || item.authorHandle === item.authorDid)
    .map((item) => item.authorDid);

  if (didsToResolve.length === 0) return items;

  const handleMap = await getHandlesByDids(didsToResolve);

  return items.map((item) => ({
    ...item,
    authorHandle: handleMap.get(item.authorDid) || item.authorHandle || item.authorDid,
  }));
}
