import { NextRequest, NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, codeVerifier, redirectUri } = body;

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: "Missing code or code_verifier" },
        { status: 400 }
      );
    }

    // Normalize redirect URI - use 127.0.0.1 for localhost
    let normalizedRedirectUri = redirectUri || `${request.nextUrl.origin}/api/spotify/callback`;
    if (normalizedRedirectUri.includes("localhost")) {
      normalizedRedirectUri = normalizedRedirectUri.replace("localhost", "127.0.0.1");
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: normalizedRedirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json(
        { error: "Failed to exchange token", details: error },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

