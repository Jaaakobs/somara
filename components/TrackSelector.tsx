"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpotifyTrack } from "@/types";
import { Plus, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TrackSelectorProps {
  playlistTracks?: SpotifyTrack[];
  onSelect: (track: SpotifyTrack) => void;
  onClose?: () => void;
}

export function TrackSelector({ playlistTracks, onSelect, onClose }: TrackSelectorProps) {
  const hasTracks = playlistTracks && playlistTracks.length > 0;

  // Debug: Log track data to see if audio features are present
  if (hasTracks && playlistTracks.length > 0) {
    console.log("TrackSelector - Total tracks:", playlistTracks.length);
    console.log("TrackSelector - First track data:", JSON.stringify(playlistTracks[0], null, 2));
    console.log("TrackSelector - Tracks with BPM:", playlistTracks.filter(t => t.bpm != null).length);
    console.log("TrackSelector - Tracks with Energy:", playlistTracks.filter(t => t.energy != null).length);
  }

  return (
    <div className="space-y-4">
      {hasTracks ? (
        <ScrollArea className="h-[400px] border rounded-lg">
          <div className="space-y-2 p-2">
            {playlistTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-start justify-between p-2 border rounded-lg hover:bg-muted cursor-pointer transition-colors max-w-full"
                onClick={() => onSelect(track)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Music className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist} • {Math.floor(track.duration / 60)}:
                      {Math.floor(track.duration % 60).toString().padStart(2, "0")}
                      {track.bpm != null && ` • ${Math.round(track.bpm)} BPM`}
                    </p>
                    {(track.bpm != null || track.energy != null || track.danceability != null || track.instrumentalness != null || track.acousticness != null) && (
                      <div className="flex flex-wrap gap-1.5 text-xs mt-1.5">
                        {track.bpm != null && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium whitespace-nowrap">
                            {Math.round(track.bpm)} BPM
                          </span>
                        )}
                        {track.energy != null && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 whitespace-nowrap">
                            Energy: {(track.energy * 100).toFixed(0)}%
                          </span>
                        )}
                        {track.instrumentalness != null && track.instrumentalness > 0.5 && (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 whitespace-nowrap">
                            Instrumental
                          </span>
                        )}
                        {track.acousticness != null && track.acousticness > 0.5 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 whitespace-nowrap">
                            Acoustic
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(track);
                  }}
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0 ml-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No tracks available in playlist
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {onClose && (
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={onClose} variant="outline" size="sm">
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

