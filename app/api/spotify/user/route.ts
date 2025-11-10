import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 401 }
      );
    }

    // Fetch user profile from Spotify
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // Format user data for the frontend
    return NextResponse.json({
      id: userData.id,
      displayName: userData.display_name,
      email: userData.email,
      imageUrl: userData.images?.[0]?.url,
      followers: userData.followers?.total || 0,
      country: userData.country,
      product: userData.product, // "premium" or "free"
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

