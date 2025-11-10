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

    // Fetch user's playlists (handle pagination)
    let allPlaylists: any[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/me/playlists?limit=50`;

    do {
      const playlistsResponse: Response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!playlistsResponse.ok) {
        if (playlistsResponse.status === 401) {
          return NextResponse.json(
            { error: "Invalid or expired token" },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: "Failed to fetch playlists" },
          { status: playlistsResponse.status }
        );
      }

      const playlistsData = await playlistsResponse.json();
      allPlaylists = [...allPlaylists, ...playlistsData.items];
      nextUrl = playlistsData.next;
    } while (nextUrl);

    // Format playlists for the frontend
    const formattedPlaylists = allPlaylists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.images?.[0]?.url,
      url: playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`,
      owner: playlist.owner?.display_name || playlist.owner?.id,
      trackCount: playlist.tracks?.total || 0,
      public: playlist.public,
    }));

    return NextResponse.json({ playlists: formattedPlaylists });
  } catch (error) {
    console.error("Playlists fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

