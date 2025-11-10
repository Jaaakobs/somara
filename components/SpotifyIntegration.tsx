"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpotifyPlaylist, SpotifyTrack } from "@/types";
import { fetchPlaylistInfo, getSpotifyEmbedUrl } from "@/lib/spotify";
import { isAuthenticated } from "@/lib/spotify-auth";
import { Loader2, Music, X, Plus, List, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrackSelector } from "./TrackSelector";
import { PlaylistSelector } from "./PlaylistSelector";

interface SpotifyIntegrationProps {
  playlist?: SpotifyPlaylist;
  onUpdate: (playlist: SpotifyPlaylist | undefined) => void;
}

export function SpotifyIntegration({ playlist, onUpdate }: SpotifyIntegrationProps) {
  const [url, setUrl] = useState(playlist?.url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [useAuth, setUseAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setUseAuth(authStatus);
    };
    checkAuth();
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please enter a Spotify URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playlistInfo = await fetchPlaylistInfo(url, useAuth);
      if (playlistInfo) {
        onUpdate(playlistInfo);
        // Auto-open track dialog if playlist has no tracks and not authenticated
        if ((!playlistInfo.tracks || playlistInfo.tracks.length === 0) && !useAuth) {
          setShowTrackDialog(true);
        }
      } else {
        setError("Could not fetch playlist information. Please check the URL.");
      }
    } catch (err) {
      setError("Error fetching playlist. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Track if we've already shown the dialog for this playlist
  const [hasShownDialog, setHasShownDialog] = useState(false);

  // Auto-open track dialog if playlist exists but has no tracks
  useEffect(() => {
    if (playlist && (!playlist.tracks || playlist.tracks.length === 0) && !hasShownDialog && !useAuth) {
      // Only auto-open if this is a newly fetched playlist (not on initial load)
      const timer = setTimeout(() => {
        setShowTrackDialog(true);
        setHasShownDialog(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [playlist?.id, useAuth]); // Only trigger when playlist ID changes (new fetch)

  // Reset hasShownDialog when playlist changes
  useEffect(() => {
    setHasShownDialog(false);
  }, [playlist?.id]);

  const handleRemove = () => {
    setUrl("");
    onUpdate(undefined);
    setError(null);
  };

  const handleAddTrack = (track: SpotifyTrack) => {
    if (!playlist) return;
    
    const updatedTracks = [...(playlist.tracks || []), track];
    const updatedPlaylist: SpotifyPlaylist = {
      ...playlist,
      tracks: updatedTracks,
      totalDuration: (playlist.totalDuration || 0) + track.duration,
    };
    
    onUpdate(updatedPlaylist);
    // Don't close dialog automatically - let user add multiple tracks
  };


  const embedUrl = playlist ? getSpotifyEmbedUrl(playlist.url) : null;

  return (
    <div className="space-y-4">
      {useAuth ? (
        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Browse Playlists
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Enter URL
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            <div className="space-y-2">
              <Label>Select a Playlist</Label>
              <p className="text-xs text-muted-foreground">
                Choose a playlist from your Spotify account
              </p>
            </div>
            <PlaylistSelector
              onSelect={(playlist) => {
                onUpdate(playlist);
                setUrl(playlist.url);
              }}
            />
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="spotify-url">Spotify Playlist/Track URL</Label>
              <div className="flex gap-2">
                <Input
                  id="spotify-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                  className="flex-1"
                />
                <Button onClick={handleFetch} disabled={isLoading || !url.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-green-500">
                ✓ Authenticated - Will fetch tracks automatically
              </p>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="spotify-url">Spotify Playlist/Track URL</Label>
          <div className="flex gap-2">
            <Input
              id="spotify-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              className="flex-1"
            />
            <Button onClick={handleFetch} disabled={isLoading || !url.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {playlist && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {playlist.imageUrl && (
                <img
                  src={playlist.imageUrl}
                  alt={playlist.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">{playlist.name}</h4>
                    </div>
                    {playlist.totalDuration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {Math.round(playlist.totalDuration / 60)} min
                      </p>
                    )}
                    {playlist.tracks && playlist.tracks.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {playlist.tracks.length} track{playlist.tracks.length !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-amber-500">
                        No tracks yet - Click "Add Tracks" to add tracks
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          variant={(!playlist.tracks || playlist.tracks.length === 0) ? "default" : "outline"} 
                          size="sm"
                          className={(!playlist.tracks || playlist.tracks.length === 0) ? "font-semibold" : ""}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {(!playlist.tracks || playlist.tracks.length === 0) ? "Add Tracks Now" : "Add Tracks"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Add Tracks to Playlist</DialogTitle>
                          <DialogDescription>
                            Add tracks to your playlist so you can map them to phases
                          </DialogDescription>
                        </DialogHeader>
                          <TrackSelector
                            playlistTracks={playlist.tracks}
                            onSelect={handleAddTrack}
                            onClose={() => setShowTrackDialog(false)}
                          />
                      </DialogContent>
                    </Dialog>
                    <Button onClick={handleRemove} variant="ghost" size="icon">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {embedUrl && (
                  <div className="mt-4">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

