import { NextRequest, NextResponse } from "next/server";

async function refreshAccessTokenIfNeeded(refreshToken: string): Promise<string | null> {
  try {
    const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playlistId = searchParams.get("id");
    let accessToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const refreshToken = request.headers.get("x-refresh-token") || null;

    if (!playlistId || !accessToken) {
      return NextResponse.json(
        { error: "Missing playlist ID or access token" },
        { status: 400 }
      );
    }

    // Fetch playlist details
    const playlistResponse = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!playlistResponse.ok) {
      const errorText = await playlistResponse.text();
      console.error("Failed to fetch playlist:", playlistResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch playlist", details: errorText },
        { status: playlistResponse.status }
      );
    }

    const playlistData = await playlistResponse.json();

    // Fetch all tracks (handle pagination)
    let allTracks: any[] = [];
    let nextUrl = playlistData.tracks.next;
    let tracksUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;

    do {
      const tracksResponse = await fetch(tracksUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!tracksResponse.ok) {
        break;
      }

      const tracksData = await tracksResponse.json();
      allTracks = [...allTracks, ...tracksData.items];
      nextUrl = tracksData.next;
      tracksUrl = nextUrl || "";
    } while (nextUrl);

    // Fetch audio features (BPM) for all tracks
    // NOTE: As of November 27, 2024, Spotify deprecated audio features endpoint for NEW applications
    // If you get 403 errors, your app may need extended mode access or was created after the deprecation date
    const trackIds = allTracks
      .filter((item: any) => item.track && !item.track.is_local)
      .map((item: any) => item.track.id)
      .filter((id: string) => id); // Remove any null/undefined IDs

    let audioFeatures: Record<string, any> = {};
    if (trackIds.length > 0) {
      console.log(`Attempting to fetch audio features for ${trackIds.length} tracks...`);
      // Spotify API allows up to 100 track IDs per request
      const batchSize = 100;
      for (let i = 0; i < trackIds.length; i += batchSize) {
        const batch = trackIds.slice(i, i + batchSize);
        const featuresUrl = `https://api.spotify.com/v1/audio-features?ids=${batch.join(",")}`;
        
        try {
          console.log(`Fetching audio features for ${batch.length} tracks...`);
          const featuresResponse = await fetch(featuresUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          
          console.log(`Audio features response status: ${featuresResponse.status}`);

          if (featuresResponse.ok) {
            const featuresData = await featuresResponse.json();
            if (featuresData.audio_features) {
              featuresData.audio_features.forEach((feature: any) => {
                if (feature && feature.id) {
                  audioFeatures[feature.id] = feature;
                }
              });
            } else {
              console.error("No audio_features in response:", featuresData);
            }
          } else {
            const errorText = await featuresResponse.text();
            console.error(`Failed to fetch audio features (${featuresResponse.status}):`, errorText);
            
            // Parse error response to get more details
            let errorDetails: any = {};
            try {
              errorDetails = JSON.parse(errorText);
              console.error("Spotify API error details:", JSON.stringify(errorDetails, null, 2));
            } catch {
              console.error("Raw error response:", errorText);
            }
            
            // If 401, try to refresh token if refresh token is available
            if (featuresResponse.status === 401 && refreshToken) {
              console.log("Token expired (401), attempting to refresh...");
              const newToken = await refreshAccessTokenIfNeeded(refreshToken);
              if (newToken) {
                console.log("Token refreshed, retrying audio features request...");
                // Retry with new token
                const retryResponse = await fetch(featuresUrl, {
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                  },
                });
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.audio_features) {
                    retryData.audio_features.forEach((feature: any) => {
                      if (feature && feature.id) {
                        audioFeatures[feature.id] = feature;
                      }
                    });
                    console.log(`Successfully fetched ${retryData.audio_features.length} audio features after token refresh`);
                  }
                } else {
                  const retryError = await retryResponse.text();
                  console.error(`Retry failed (${retryResponse.status}):`, retryError);
                }
              } else {
                console.error("Failed to refresh token");
              }
            } else if (featuresResponse.status === 403) {
              console.error("403 Forbidden - Audio features endpoint not accessible");
              console.error("This is likely because:");
              console.error("1. Your Spotify app was created after November 27, 2024");
              console.error("2. Spotify deprecated audio features endpoint for new applications");
              console.error("3. Your app may need 'Extended Mode' access (contact Spotify support)");
              console.error("Error response:", errorDetails);
              console.warn("Continuing without audio features - tracks will not have BPM/energy data");
            }
          }
        } catch (error) {
          console.error("Error fetching audio features:", error);
          // Continue even if audio features fail
        }
      }
    }

    return NextResponse.json({
      playlist: playlistData,
      tracks: allTracks,
      audioFeatures,
    });
  } catch (error) {
    console.error("Playlist fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

