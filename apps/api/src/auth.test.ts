import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyHmac, decodeJwt, createSiteAuthMiddleware, requireUserAuth, AuthenticatedRequest } from "./auth.js";
import { Request, Response, NextFunction } from "express";

const TEST_SECRET = "test-secret-key";

// Helper to create a valid HMAC signature
function createValidSignature(timestamp: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(timestamp).digest("hex");
}

// Helper to create a mock JWT
function createMockJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "mock-signature";
  return `${header}.${body}.${signature}`;
}

describe("verifyHmac", () => {
  it("should return true for valid HMAC signature", () => {
    const timestamp = Date.now().toString();
    const signature = createValidSignature(timestamp, TEST_SECRET);

    expect(verifyHmac(timestamp, signature, TEST_SECRET)).toBe(true);
  });

  it("should return false for invalid signature", () => {
    const timestamp = Date.now().toString();
    const invalidSignature = "invalid-signature-that-is-64-chars-long-0000000000000000000000";

    expect(verifyHmac(timestamp, invalidSignature, TEST_SECRET)).toBe(false);
  });

  it("should return false for wrong secret", () => {
    const timestamp = Date.now().toString();
    const signature = createValidSignature(timestamp, TEST_SECRET);

    expect(verifyHmac(timestamp, signature, "wrong-secret")).toBe(false);
  });

  it("should return false for modified timestamp", () => {
    const timestamp = Date.now().toString();
    const signature = createValidSignature(timestamp, TEST_SECRET);
    const modifiedTimestamp = (parseInt(timestamp) + 1).toString();

    expect(verifyHmac(modifiedTimestamp, signature, TEST_SECRET)).toBe(false);
  });

  it("should return false for signature with different length", () => {
    const timestamp = Date.now().toString();
    const shortSignature = "tooshort";

    expect(verifyHmac(timestamp, shortSignature, TEST_SECRET)).toBe(false);
  });
});

describe("decodeJwt", () => {
  it("should decode valid JWT and return payload", () => {
    const payload = { sub: "did:plc:abc123", iat: 1234567890 };
    const token = createMockJwt(payload);

    const result = decodeJwt(token);

    expect(result).toEqual(payload);
  });

  it("should return null for invalid JWT (not 3 parts)", () => {
    expect(decodeJwt("invalid")).toBe(null);
    expect(decodeJwt("only.two")).toBe(null);
    expect(decodeJwt("too.many.parts.here")).toBe(null);
  });

  it("should return null for malformed base64 payload", () => {
    const token = "header.!!!invalid-base64!!!.signature";

    expect(decodeJwt(token)).toBe(null);
  });

  it("should return null for non-JSON payload", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
    const body = Buffer.from("not-json").toString("base64url");
    const token = `${header}.${body}.signature`;

    expect(decodeJwt(token)).toBe(null);
  });

  it("should extract DID from sub claim", () => {
    const did = "did:plc:test123";
    const token = createMockJwt({ sub: did, iat: Date.now() });

    const result = decodeJwt(token);

    expect(result?.sub).toBe(did);
  });
});

describe("createSiteAuthMiddleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    nextFn = vi.fn();
    mockReq = { headers: {} };
  });

  it("should call next() for valid timestamp and signature", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET);
    const timestamp = Date.now().toString();
    const signature = createValidSignature(timestamp, TEST_SECRET);

    mockReq.headers = {
      "x-timestamp": timestamp,
      "x-signature": signature,
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("should return 403 when timestamp is missing", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET);
    mockReq.headers = {
      "x-signature": "some-signature",
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing signature" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 403 when signature is missing", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET);
    mockReq.headers = {
      "x-timestamp": Date.now().toString(),
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing signature" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 403 when timestamp is expired", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET, 5 * 60 * 1000); // 5 min expiry
    const oldTimestamp = (Date.now() - 6 * 60 * 1000).toString(); // 6 minutes ago
    const signature = createValidSignature(oldTimestamp, TEST_SECRET);

    mockReq.headers = {
      "x-timestamp": oldTimestamp,
      "x-signature": signature,
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Request expired" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 403 when signature is invalid", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET);
    const timestamp = Date.now().toString();
    const invalidSignature = createValidSignature(timestamp, "wrong-secret");

    mockReq.headers = {
      "x-timestamp": timestamp,
      "x-signature": invalidSignature,
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid signature" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should accept request within expiry window", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET, 5 * 60 * 1000);
    const timestamp = (Date.now() - 4 * 60 * 1000).toString(); // 4 minutes ago (within 5 min window)
    const signature = createValidSignature(timestamp, TEST_SECRET);

    mockReq.headers = {
      "x-timestamp": timestamp,
      "x-signature": signature,
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("should return 403 for non-numeric timestamp", () => {
    const middleware = createSiteAuthMiddleware(TEST_SECRET);
    mockReq.headers = {
      "x-timestamp": "not-a-number",
      "x-signature": "some-signature",
    };

    middleware(mockReq as Request, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Request expired" });
    expect(nextFn).not.toHaveBeenCalled();
  });
});

describe("requireUserAuth", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = { status: statusMock, json: jsonMock };
    nextFn = vi.fn();
    mockReq = { headers: {} };
  });

  it("should call next() and set authenticatedDid for valid Bearer token", () => {
    const did = "did:plc:testuser123";
    const token = createMockJwt({ sub: did, iat: Date.now() });

    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };

    requireUserAuth(mockReq as AuthenticatedRequest, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalled();
    expect(mockReq.authenticatedDid).toBe(did);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header is missing", () => {
    mockReq.headers = {};

    requireUserAuth(mockReq as AuthenticatedRequest, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing authorization header" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header does not start with Bearer", () => {
    mockReq.headers = {
      authorization: "Basic abc123",
    };

    requireUserAuth(mockReq as AuthenticatedRequest, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Missing authorization header" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 401 for invalid JWT format", () => {
    mockReq.headers = {
      authorization: "Bearer invalid-token",
    };

    requireUserAuth(mockReq as AuthenticatedRequest, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("should return 401 when JWT has no sub claim", () => {
    const token = createMockJwt({ iat: Date.now() }); // No sub claim

    mockReq.headers = {
      authorization: `Bearer ${token}`,
    };

    requireUserAuth(mockReq as AuthenticatedRequest, mockRes as Response, nextFn);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({ error: "Invalid token" });
    expect(nextFn).not.toHaveBeenCalled();
  });
});

describe("HMAC client-server compatibility", () => {
  it("should work with Web Crypto API compatible signatures", async () => {
    // Simulate what the client generates using Web Crypto API
    const timestamp = Date.now().toString();
    const secret = TEST_SECRET;

    // Client-side equivalent (using Node's crypto to simulate Web Crypto)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(timestamp);

    // Using Node crypto to generate what Web Crypto would produce
    const signature = crypto
      .createHmac("sha256", keyData)
      .update(messageData)
      .digest("hex");

    // Server-side verification
    expect(verifyHmac(timestamp, signature, secret)).toBe(true);
  });
});
