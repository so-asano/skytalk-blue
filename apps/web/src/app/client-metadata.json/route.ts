import { NextResponse } from "next/server";
import { OAUTH_SCOPE } from "@/lib/constants";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const metadata = {
    client_id: `${baseUrl}/client-metadata.json`,
    client_name: "SkyTalk.Blue",
    client_uri: baseUrl,
    logo_uri: `${baseUrl}/logo.png`,
    tos_uri: `${baseUrl}/terms`,
    policy_uri: `${baseUrl}/privacy`,
    redirect_uris: [`${baseUrl}/oauth/callback`],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: OAUTH_SCOPE,
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(metadata);
}
