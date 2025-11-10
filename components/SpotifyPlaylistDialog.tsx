"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotifyPlaylist, SpotifyTrack } from "@/types";
import { fetchPlaylistInfo, getSpotifyEmbedUrl } from "@/lib/spotify";
import { isAuthenticated, getStoredAccessToken } from "@/lib/spotify-auth";
import { Loader2, Music, List, Link as LinkIcon, CheckCircle2, X } from "lucide-react";
import { SpotifyAuth } from "./SpotifyAuth";
import { PlaylistSelector } from "./PlaylistSelector";
import { TrackSelector } from "./TrackSelector";

interface SpotifyPlaylistDialogProps {
  playlist?: SpotifyPlaylist;
  onUpdate: (playlist: SpotifyPlaylist | undefined) => void;
}

export function SpotifyPlaylistDialog({ playlist, onUpdate }: SpotifyPlaylistDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    const interval = setInterval(checkAuth, 5000); // Check every 5 seconds instead of 1
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
        setUrl(playlistInfo.url);
        setIsOpen(false);
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

  const handleSelectPlaylist = (selectedPlaylist: SpotifyPlaylist) => {
    onUpdate(selectedPlaylist);
    setUrl(selectedPlaylist.url);
    setIsOpen(false);
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
  };


  const handleRemove = () => {
    setUrl("");
    onUpdate(undefined);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Music className="h-4 w-4 mr-2" />
          {playlist ? `Change Playlist` : "Add Spotify Playlist"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spotify Playlist</DialogTitle>
          <DialogDescription>
            Connect your Spotify account or enter a playlist URL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Playlist Selection */}
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
                  onSelect={handleSelectPlaylist}
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

          {/* Current Playlist Display */}
          {playlist && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {playlist.imageUrl && (
                    <img
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      className="h-16 w-16 rounded-lg object-cover"
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
                            No tracks yet
                          </p>
                        )}
                      </div>
                      <Button onClick={handleRemove} variant="ghost" size="icon">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {playlist.tracks && playlist.tracks.length === 0 && (
                      <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            <Music className="h-4 w-4 mr-2" />
                            Add Tracks
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
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

