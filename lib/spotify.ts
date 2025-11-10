import { SpotifyPlaylist, SpotifyTrack } from "@/types";
import { getStoredAccessToken } from "./spotify-auth";

// Extract playlist ID from Spotify URL
export function extractPlaylistId(url: string): string | null {
  const patterns = [
    /playlist\/([a-zA-Z0-9]+)/,
    /album\/([a-zA-Z0-9]+)/,
    /track\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Get playlist type from URL
export function getPlaylistType(url: string): "playlist" | "album" | "track" | null {
  if (url.includes("/playlist/")) return "playlist";
  if (url.includes("/album/")) return "album";
  if (url.includes("/track/")) return "track";
  return null;
}

// Fetch playlist data from Spotify public API
// If authenticated, fetches full playlist with tracks
// Otherwise, uses oEmbed API for basic info
export async function fetchPlaylistInfo(url: string, useAuth: boolean = false): Promise<SpotifyPlaylist | null> {
  const id = extractPlaylistId(url);
  const type = getPlaylistType(url);
  
  if (!id || !type) return null;

  // If authenticated and it's a playlist, fetch full data with tracks
  if (useAuth && type === "playlist") {
    const accessToken = await getStoredAccessToken();
    const refreshToken = typeof window !== "undefined" ? localStorage.getItem("spotify_refresh_token") : null;
    if (accessToken) {
      try {
        const response = await fetch(
          `/api/spotify/playlist?id=${id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {}),
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const playlist = data.playlist;
          const audioFeatures = data.audioFeatures || {};
          const tracks: SpotifyTrack[] = data.tracks
            .filter((item: any) => item.track && !item.track.is_local)
            .map((item: any) => {
              const trackId = item.track.id;
              const features = audioFeatures[trackId];
              
              // Debug: Log if features are missing
              if (!features && trackId) {
                console.warn(`No audio features found for track ${trackId}: ${item.track.name}`);
              }
              
              // Extract audio features from Spotify API
              // Note: tempo can be 0 or null, so we check for != null instead of > 0
              return {
                id: trackId,
                name: item.track.name,
                artist: item.track.artists.map((a: any) => a.name).join(", "),
                duration: Math.floor(item.track.duration_ms / 1000),
                previewUrl: item.track.preview_url,
                // Audio features - tempo is a float, can be 0 or any positive number
                bpm: features?.tempo != null ? Math.round(features.tempo) : undefined,
                energy: features?.energy != null ? Math.round(features.energy * 100) / 100 : undefined,
                danceability: features?.danceability != null ? Math.round(features.danceability * 100) / 100 : undefined,
                acousticness: features?.acousticness != null ? Math.round(features.acousticness * 100) / 100 : undefined,
                instrumentalness: features?.instrumentalness != null ? Math.round(features.instrumentalness * 100) / 100 : undefined,
                valence: features?.valence != null ? Math.round(features.valence * 100) / 100 : undefined,
                speechiness: features?.speechiness != null ? Math.round(features.speechiness * 100) / 100 : undefined,
              };
            });

          const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);

          return {
            id,
            name: playlist.name,
            imageUrl: playlist.images?.[0]?.url,
            url,
            tracks,
            totalDuration,
          };
        }
      } catch (error) {
        console.error("Error fetching authenticated playlist:", error);
        // Fall through to oEmbed API
      }
    }
  }
  
  // Fallback to oEmbed API for basic info
  try {
    const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(oEmbedUrl);
    
    if (response.ok) {
      const data = await response.json();
      return {
        id,
        name: data.title || "Untitled Playlist",
        imageUrl: data.thumbnail_url,
        url,
        tracks: [],
        totalDuration: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching playlist info:", error);
  }
  
  // Fallback: create basic playlist object
  return {
    id,
    name: "Playlist",
    url,
    tracks: [],
    totalDuration: 0,
  };
}

// Generate Spotify embed URL
export function getSpotifyEmbedUrl(url: string): string {
  const id = extractPlaylistId(url);
  const type = getPlaylistType(url);
  
  if (!id || !type) return "";
  
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

