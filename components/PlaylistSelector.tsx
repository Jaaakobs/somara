"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpotifyPlaylist } from "@/types";
import { getStoredAccessToken } from "@/lib/spotify-auth";
import { Music, Loader2, ExternalLink } from "lucide-react";

interface PlaylistSelectorProps {
  onSelect: (playlist: SpotifyPlaylist) => void;
  onClose?: () => void;
}

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  url: string;
  owner: string;
  trackCount: number;
  public: boolean;
}

export function PlaylistSelector({ onSelect, onClose }: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) {
        setError("Not authenticated");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/spotify/playlists", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError("Authentication expired. Please reconnect to Spotify.");
          } else {
            setError("Failed to fetch playlists");
          }
          return;
        }

        const data = await response.json();
        setPlaylists(data.playlists || []);
      } catch (err) {
        console.error("Error fetching playlists:", err);
        setError("Error fetching playlists. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleSelect = async (playlistItem: SpotifyPlaylistItem) => {
    // Fetch full playlist details with tracks
    const accessToken = await getStoredAccessToken();
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/spotify/playlist?id=${playlistItem.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const playlist = data.playlist;
        const audioFeatures = data.audioFeatures || {};
        const tracks = data.tracks
          .filter((item: any) => item.track && !item.track.is_local)
          .map((item: any) => {
            const trackId = item.track.id;
            const features = audioFeatures[trackId];
            
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

        const totalDuration = tracks.reduce((sum: number, t: any) => sum + t.duration, 0);

        const fullPlaylist: SpotifyPlaylist = {
          id: playlist.id,
          name: playlist.name,
          imageUrl: playlist.images?.[0]?.url,
          url: playlistItem.url,
          tracks,
          totalDuration,
        };

        onSelect(fullPlaylist);
        onClose?.();
      }
    } catch (err) {
      console.error("Error fetching playlist details:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading playlists...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (playlists.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No playlists found. Create a playlist on Spotify to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={() => handleSelect(playlist)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {playlist.imageUrl ? (
                  <img
                    src={playlist.imageUrl}
                    alt={playlist.name}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Music className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{playlist.name}</h4>
                      {playlist.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {playlist.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{playlist.trackCount} tracks</span>
                        <span>•</span>
                        <span>{playlist.owner}</span>
                        {!playlist.public && <span>• Private</span>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(playlist.url, "_blank");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

