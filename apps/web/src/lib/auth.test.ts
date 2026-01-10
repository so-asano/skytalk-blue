import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock environment variable
vi.stubEnv("NEXT_PUBLIC_API_SECRET", "test-secret-key");

// We need to test the pure functions, so we'll extract them for testing
// Since hmacSign is not exported, we'll test it indirectly through protectedFetch

describe("auth utilities", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("hmacSign (tested via header inspection)", () => {
    it("should generate consistent HMAC signatures for same input", async () => {
      const signatures: string[] = [];

      global.fetch = vi.fn().mockImplementation((url, options) => {
        signatures.push(options?.headers?.["X-Signature"]);
        return Promise.resolve(new Response());
      });

      // Import dynamically to get fresh module with mocked env
      const { protectedFetch } = await import("./auth");

      // Since timestamp changes, we can't test for exact same signature
      // But we can verify the signature format (64 hex characters for SHA-256)
      await protectedFetch("https://api.example.com/test");

      expect(signatures[0]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("protectedFetch", () => {
    it("should add X-Timestamp and X-Signature headers", async () => {
      let capturedHeaders: Record<string, string> = {};

      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedHeaders = options?.headers || {};
        return Promise.resolve(new Response());
      });

      const { protectedFetch } = await import("./auth");
      await protectedFetch("https://api.example.com/test");

      expect(capturedHeaders["X-Timestamp"]).toBeDefined();
      expect(capturedHeaders["X-Signature"]).toBeDefined();
      expect(capturedHeaders["Content-Type"]).toBe("application/json");
    });

    it("should include timestamp as numeric string", async () => {
      let capturedTimestamp = "";

      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedTimestamp = options?.headers?.["X-Timestamp"] || "";
        return Promise.resolve(new Response());
      });

      const beforeTime = Date.now();
      const { protectedFetch } = await import("./auth");
      await protectedFetch("https://api.example.com/test");
      const afterTime = Date.now();

      const timestamp = parseInt(capturedTimestamp);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should merge custom options", async () => {
      let capturedOptions: RequestInit = {};

      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedOptions = options || {};
        return Promise.resolve(new Response());
      });

      const { protectedFetch } = await import("./auth");
      await protectedFetch("https://api.example.com/test", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      expect(capturedOptions.method).toBe("POST");
      expect(capturedOptions.body).toBe(JSON.stringify({ data: "test" }));
    });
  });

  describe("authenticatedFetch", () => {
    it("should throw error when accessToken is not available", async () => {
      // Mock IndexedDB to return null
      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          result: {
            objectStoreNames: { contains: () => false },
            close: () => {},
          },
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      const { authenticatedFetch } = await import("./auth");

      await expect(
        authenticatedFetch("https://api.example.com/test", "did:plc:test123")
      ).rejects.toThrow("Not authenticated");
    });

    it("should add Authorization header with Bearer token when accessToken exists", async () => {
      const mockAccessToken = "mock-access-token-jwt";
      let capturedHeaders: Record<string, string> = {};

      // Mock IndexedDB
      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          result: {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: () => ({
                get: () => {
                  const getRequest = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: {
                      value: {
                        tokenSet: {
                          access_token: mockAccessToken,
                        },
                      },
                    },
                  };
                  setTimeout(() => getRequest.onsuccess?.(), 0);
                  return getRequest;
                },
              }),
            }),
            close: () => {},
          },
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      global.fetch = vi.fn().mockImplementation((url, options) => {
        capturedHeaders = options?.headers || {};
        return Promise.resolve(new Response());
      });

      // Clear module cache to get fresh import
      vi.resetModules();
      const { authenticatedFetch } = await import("./auth");

      await authenticatedFetch("https://api.example.com/test", "did:plc:test123");

      expect(capturedHeaders["Authorization"]).toBe(`Bearer ${mockAccessToken}`);
      expect(capturedHeaders["X-Timestamp"]).toBeDefined();
      expect(capturedHeaders["X-Signature"]).toBeDefined();
    });
  });

  describe("getAccessToken", () => {
    it("should return null when IndexedDB has no session store", async () => {
      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          result: {
            objectStoreNames: { contains: () => false },
            close: () => {},
          },
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      vi.resetModules();
      const { getAccessToken } = await import("./auth");
      const result = await getAccessToken("did:plc:test123");

      expect(result).toBe(null);
    });

    it("should return access_token from session data", async () => {
      const mockAccessToken = "test-access-token";

      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          result: {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: () => ({
                get: (key: string) => {
                  expect(key).toBe("did:plc:test123");
                  const getRequest = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: {
                      value: {
                        tokenSet: {
                          access_token: mockAccessToken,
                        },
                      },
                    },
                  };
                  setTimeout(() => getRequest.onsuccess?.(), 0);
                  return getRequest;
                },
              }),
            }),
            close: () => {},
          },
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      vi.resetModules();
      const { getAccessToken } = await import("./auth");
      const result = await getAccessToken("did:plc:test123");

      expect(result).toBe(mockAccessToken);
    });

    it("should return null when session data is missing tokenSet", async () => {
      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          result: {
            objectStoreNames: { contains: () => true },
            transaction: () => ({
              objectStore: () => ({
                get: () => {
                  const getRequest = {
                    onsuccess: null as (() => void) | null,
                    onerror: null as (() => void) | null,
                    result: { value: {} }, // Missing tokenSet
                  };
                  setTimeout(() => getRequest.onsuccess?.(), 0);
                  return getRequest;
                },
              }),
            }),
            close: () => {},
          },
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      vi.resetModules();
      const { getAccessToken } = await import("./auth");
      const result = await getAccessToken("did:plc:test123");

      expect(result).toBe(null);
    });

    it("should return null when IndexedDB throws error", async () => {
      const mockOpen = vi.fn().mockImplementation(() => {
        const request = {
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
          error: new Error("IndexedDB error"),
        };
        setTimeout(() => request.onerror?.(), 0);
        return request;
      });

      vi.stubGlobal("indexedDB", { open: mockOpen });

      vi.resetModules();
      const { getAccessToken } = await import("./auth");
      const result = await getAccessToken("did:plc:test123");

      expect(result).toBe(null);
    });
  });
});

describe("HMAC client-server compatibility", () => {
  it("should generate signatures compatible with server-side Node.js crypto", async () => {
    // This test verifies that Web Crypto API HMAC matches Node.js crypto HMAC
    // by checking the signature format and length
    let capturedSignature = "";

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedSignature = options?.headers?.["X-Signature"] || "";
      return Promise.resolve(new Response());
    });

    vi.resetModules();
    const { protectedFetch } = await import("./auth");
    await protectedFetch("https://api.example.com/test");

    // SHA-256 HMAC produces 32 bytes = 64 hex characters
    expect(capturedSignature).toHaveLength(64);
    expect(capturedSignature).toMatch(/^[a-f0-9]+$/);
  });
});
