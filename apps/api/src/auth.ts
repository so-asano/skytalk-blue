import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  authenticatedDid?: string;
}

// HMAC verification
export function verifyHmac(timestamp: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");

  // Ensure both buffers have same length for timingSafeEqual
  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Decode JWT without verification (to extract DID from sub claim)
export function decodeJwt(token: string): { sub?: string; [key: string]: unknown } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload;
  } catch {
    return null;
  }
}

// Create site-level protection middleware (HMAC + timestamp)
export function createSiteAuthMiddleware(secret: string, expiryMs: number = 5 * 60 * 1000) {
  return function requireSiteAuth(req: Request, res: Response, next: NextFunction) {
    const timestamp = req.headers["x-timestamp"] as string;
    const signature = req.headers["x-signature"] as string;

    if (!timestamp || !signature) {
      res.status(403).json({ error: "Missing signature" });
      return;
    }

    // Check timestamp is within expiry window
    const timestampNum = parseInt(timestamp);
    if (isNaN(timestampNum) || Date.now() - timestampNum > expiryMs) {
      res.status(403).json({ error: "Request expired" });
      return;
    }

    // Verify HMAC
    try {
      if (!verifyHmac(timestamp, signature, secret)) {
        res.status(403).json({ error: "Invalid signature" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid signature" });
      return;
    }

    next();
  };
}

// User-level protection middleware (requires Bearer token)
export function requireUserAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const jwtPayload = decodeJwt(token);

  if (!jwtPayload?.sub) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.authenticatedDid = jwtPayload.sub;
  next();
}
