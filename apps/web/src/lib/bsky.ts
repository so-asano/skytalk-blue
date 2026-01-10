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
