import { NextRequest, NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refresh_token" },
        { status: 400 }
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json(
        { error: "Failed to refresh token", details: error },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Spotify may or may not return a new refresh token
    // If it doesn't, we keep using the old one
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in || 3600,
      refresh_token: tokenData.refresh_token || refreshToken, // Use new one if provided, otherwise keep old
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

