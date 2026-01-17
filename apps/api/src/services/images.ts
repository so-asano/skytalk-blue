import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// R2 configuration (optional)
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://images.skytalk.blue

const THUMB_SIZE = 400;

// Initialize S3 client for R2 if configured
const s3Client = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME
  ? new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

// Cache for PDS endpoints
const pdsCache = new Map<string, string>();

/**
 * Resolve DID to PDS endpoint
 */
async function getPdsEndpoint(did: string): Promise<string> {
  const cached = pdsCache.get(did);
  if (cached) return cached;

  try {
    if (did.startsWith("did:plc:")) {
      const res = await fetch(`https://plc.directory/${did}`);
      if (res.ok) {
        const data = await res.json() as { service?: Array<{ id: string; serviceEndpoint: string }> };
        const pds = data.service?.find((s) => s.id === "#atproto_pds");
        if (pds?.serviceEndpoint) {
          pdsCache.set(did, pds.serviceEndpoint);
          return pds.serviceEndpoint;
        }
      }
    } else if (did.startsWith("did:web:")) {
      const domain = did.replace("did:web:", "");
      const res = await fetch(`https://${domain}/.well-known/did.json`);
      if (res.ok) {
        const data = await res.json() as { service?: Array<{ id: string; serviceEndpoint: string }> };
        const pds = data.service?.find((s) => s.id === "#atproto_pds");
        if (pds?.serviceEndpoint) {
          pdsCache.set(did, pds.serviceEndpoint);
          return pds.serviceEndpoint;
        }
      }
    }
  } catch (error) {
    console.error(`Failed to resolve PDS for ${did}:`, error);
  }

  // Fallback to bsky.social
  const fallback = "https://bsky.social";
  pdsCache.set(did, fallback);
  return fallback;
}

/**
 * Fetch blob from PDS
 */
async function fetchBlobFromPds(did: string, cid: string): Promise<Buffer | null> {
  try {
    const pdsEndpoint = await getPdsEndpoint(did);
    const url = `${pdsEndpoint}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch blob: ${res.status} ${res.statusText}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error fetching blob from PDS:`, error);
    return null;
  }
}

/**
 * Generate thumbnail from image buffer
 */
async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Get object from R2
 */
async function getFromR2(key: string): Promise<Buffer | null> {
  if (!s3Client || !R2_BUCKET_NAME) return null;

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));

    if (!response.Body) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/**
 * Save object to R2
 */
async function saveToR2(key: string, buffer: Buffer, contentType: string): Promise<boolean> {
  if (!s3Client || !R2_BUCKET_NAME) return false;

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return true;
  } catch (error) {
    console.error(`Failed to save to R2:`, error);
    return false;
  }
}

export type ImageSize = "original" | "thumb";

export interface ImageResult {
  buffer: Buffer;
  contentType: string;
  cacheHit: boolean;
}

/**
 * Get image with optional R2 caching
 * Falls back to PDS if R2 is not configured or cache miss
 */
export async function getImage(did: string, cid: string, size: ImageSize): Promise<ImageResult | null> {
  const cacheKey = `${did}/${cid}/${size}`;

  // Try R2 cache first
  if (s3Client) {
    const cached = await getFromR2(cacheKey);
    if (cached) {
      return {
        buffer: cached,
        contentType: size === "thumb" ? "image/jpeg" : "image/jpeg",
        cacheHit: true,
      };
    }
  }

  // Fetch from PDS
  const original = await fetchBlobFromPds(did, cid);
  if (!original) {
    return null;
  }

  // Detect content type
  let contentType = "image/jpeg";
  try {
    const metadata = await sharp(original).metadata();
    if (metadata.format) {
      contentType = `image/${metadata.format}`;
    }
  } catch {
    // Use default
  }

  let resultBuffer: Buffer;
  let resultContentType: string;

  if (size === "thumb") {
    resultBuffer = await generateThumbnail(original);
    resultContentType = "image/jpeg"; // Thumbnails are always JPEG
  } else {
    resultBuffer = original;
    resultContentType = contentType;
  }

  // Save to R2 cache (async, don't wait)
  if (s3Client) {
    saveToR2(cacheKey, resultBuffer, resultContentType).catch((err) => {
      console.error("Failed to cache image:", err);
    });
  }

  return {
    buffer: resultBuffer,
    contentType: resultContentType,
    cacheHit: false,
  };
}

/**
 * Get R2 public URL if configured
 */
export function getPublicUrl(did: string, cid: string, size: ImageSize): string | null {
  if (!R2_PUBLIC_URL) return null;
  return `${R2_PUBLIC_URL}/${did}/${cid}/${size}`;
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return s3Client !== null;
}
