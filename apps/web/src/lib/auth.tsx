"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { BrowserOAuthClient, clientMetadataSchema } from "@atproto/oauth-client-browser";
import { Agent } from "@atproto/api";
import { OAUTH_SCOPE } from "./constants";
import { getProfile } from "./bsky";

interface User {
  did: string;
  handle: string;
}

interface AuthContextType {
  user: User | null;
  agent: Agent | null;
  loading: boolean;
  login: (handle: string, locale?: "ja" | "en") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

let oauthClient: BrowserOAuthClient | null = null;

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || "";

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Site-level protected fetch (HMAC + timestamp)
export async function protectedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const timestamp = Date.now().toString();
  const signature = await hmacSign(timestamp, API_SECRET);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      "X-Timestamp": timestamp,
      "X-Signature": signature,
    },
  });
}

// User-level protected fetch (HMAC + timestamp + Bearer token)
export async function authenticatedFetch(
  url: string,
  did: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken(did);
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const timestamp = Date.now().toString();
  const signature = await hmacSign(timestamp, API_SECRET);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getAccessToken(did: string): Promise<string | null> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("@atproto-oauth-client");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!db.objectStoreNames.contains("session")) {
      db.close();
      return null;
    }

    const tx = db.transaction("session", "readonly");
    const store = tx.objectStore("session");
    const sessionData = await new Promise<any>((resolve, reject) => {
      const req = store.get(did);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return sessionData?.value?.tokenSet?.access_token || null;
  } catch (e) {
    console.error("Failed to get access token:", e);
    return null;
  }
}

async function getOAuthClient(forceNew = false) {
  if (oauthClient && !forceNew) return oauthClient;

  const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;

  const rawClientMetadata = {
    client_id: `${baseUrl}/client-metadata.json`,
    client_name: "SkyTalk.Blue",
    client_uri: baseUrl,
    redirect_uris: [`${baseUrl}/oauth/callback`],
    scope: OAUTH_SCOPE,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    dpop_bound_access_tokens: true,
    token_endpoint_auth_method: "none",
    logo_uri: `${baseUrl}/logo.png`,
    tos_uri: `${baseUrl}/terms`,
    policy_uri: `${baseUrl}/privacy`,
  };

  const clientMetadata = clientMetadataSchema.parse(rawClientMetadata);

  oauthClient = new BrowserOAuthClient({
    clientMetadata,
    handleResolver: "https://bsky.social",
  });

  return oauthClient;
}

export async function resetOAuthClient() {
  oauthClient = null;
  // Clear IndexedDB storage to remove stale OAuth state
  try {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name?.includes("atproto") || db.name?.includes("oauth")) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (e) {
    console.warn("Failed to clear IndexedDB:", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and restore session
  useEffect(() => {
    async function init() {
      try {
        const client = await getOAuthClient();
        const result = await client.init();

        if (result?.session) {
          const newAgent = new Agent(result.session);
          const profile = await getProfile(result.session.did);
          setUser({
            did: result.session.did,
            handle: profile?.handle || result.session.did,
          });
          setAgent(newAgent);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const login = useCallback(async (handle: string, locale?: "ja" | "en") => {
    try {
      // Reset client to clear any stale state from previous failed attempts
      const client = await getOAuthClient(true);
      await client.signIn(handle, {
        scope: OAUTH_SCOPE,
        ui_locales: locale || "ja",
      });
      // Redirect will happen, so we don't need to do anything else here
    } catch (error) {
      console.error("Login error:", error);
      await resetOAuthClient();
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const client = await getOAuthClient();
      if (user?.did) {
        await client.revoke(user.did);
      }
      setUser(null);
      setAgent(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [user?.did]);

  return (
    <AuthContext.Provider value={{ user, agent, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
