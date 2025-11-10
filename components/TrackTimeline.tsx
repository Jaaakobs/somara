"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTimelineStore } from "@/lib/store";
import { useMemo } from "react";
import { BreathworkPhase, SpotifyTrack, PhaseTrack, SpotifyPlaylist } from "@/types";
import { Plus, Music, X, Settings2, GripVertical, Play, Pause, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrackSelector } from "./TrackSelector";
import { fetchPlaylistInfo } from "@/lib/spotify";
import { isAuthenticated, getStoredAccessToken } from "@/lib/spotify-auth";
import {
  initializeSpotifyPlayer,
  getSpotifyPlayer,
  isSpotifyPlayerReady,
  playSpotifyTrack,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  seekSpotifyPlayback,
  disconnectSpotifyPlayer,
  type SpotifyPlayer,
} from "@/lib/spotify-player";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PHASE_COLORS: Record<string, string> = {
  introduction: "bg-gray-400",
  grounding: "bg-blue-500",
  breathing: "bg-purple-500",
  integration: "bg-green-500",
  custom: "bg-orange-500",
};

interface TrackWithPosition extends PhaseTrack {
  absoluteStartTime: number; // in seconds, absolute position on timeline
  phaseId: string;
}

interface SortableTrackItemProps {
  track: TrackWithPosition;
  totalDuration: number;
  onUpdate: (trackId: string, updates: Partial<TrackWithPosition>) => void;
  onRemove: (trackId: string) => void;
  allTracks: TrackWithPosition[];
  isPlaying?: boolean;
}

function SortableTrackItem({
  track,
  totalDuration,
  onUpdate,
  onRemove,
  allTracks,
  isPlaying = false,
}: SortableTrackItemProps) {
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartTime, setResizeStartTime] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(0);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate track position and width relative to entire timeline
  const trackStartPercent = (track.absoluteStartTime / 60 / totalDuration) * 100;
  const trackWidthPercent = (track.duration / 60 / totalDuration) * 100;
  
  // Ensure minimum visible width
  const minWidth = 2; // Minimum 2% width to be visible
  const finalWidth = Math.max(trackWidthPercent, minWidth);

  const maxStartTime = totalDuration * 60 - track.duration; // Max start time in seconds

  const handleStartTimeChange = (value: number[]) => {
    const newAbsoluteStartTime = Math.max(0, Math.min(value[0] * 60, maxStartTime));
    onUpdate(track.id, { absoluteStartTime: newAbsoluteStartTime });
  };

  const handleDurationChange = (value: number[]) => {
    const newDuration = Math.max(30, value[0] * 60); // Min 30s
    // Ensure track doesn't exceed timeline boundaries
    const maxTimelineDuration = totalDuration * 60 - track.absoluteStartTime;
    // Don't allow extending beyond original track length
    // Use originalDuration if available, otherwise allow up to current duration (for backwards compatibility)
    const maxOriginalDuration = track.originalDuration ?? track.duration;
    const adjustedDuration = Math.min(newDuration, maxTimelineDuration, maxOriginalDuration);
    onUpdate(track.id, { duration: adjustedDuration });
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(side);
    setResizeStartX(e.clientX);
    setResizeStartTime(track.absoluteStartTime);
    setResizeStartDuration(track.duration);
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const timelineElement = document.querySelector('[data-timeline-container]') as HTMLElement;
      if (!timelineElement) return;

      const timelineRect = timelineElement.getBoundingClientRect();
      const deltaX = e.clientX - resizeStartX;
      const deltaSeconds = (deltaX / timelineRect.width) * (totalDuration * 60);

      if (isResizing === 'left') {
        // Resize from left edge - adjust start time and duration
        const newStartTime = Math.max(0, resizeStartTime + deltaSeconds);
        const newDuration = Math.max(30, resizeStartDuration - deltaSeconds);
        const maxStartTime = totalDuration * 60 - newDuration;
        const adjustedStartTime = Math.min(newStartTime, maxStartTime);
        const maxTimelineDuration = totalDuration * 60 - adjustedStartTime;
        // Don't allow extending beyond original track length
        // Use originalDuration if available, otherwise allow up to current duration (for backwards compatibility)
        const maxOriginalDuration = track.originalDuration ?? track.duration;
        const adjustedDuration = Math.max(30, Math.min(maxTimelineDuration, maxOriginalDuration));
        
        onUpdate(track.id, {
          absoluteStartTime: adjustedStartTime,
          duration: adjustedDuration,
        });
      } else if (isResizing === 'right') {
        // Resize from right edge - adjust duration only
        const newDuration = Math.max(30, resizeStartDuration + deltaSeconds);
        const maxTimelineDuration = totalDuration * 60 - track.absoluteStartTime;
        // Don't allow extending beyond original track length
        // Use originalDuration if available, otherwise allow up to current duration (for backwards compatibility)
        const maxOriginalDuration = track.originalDuration ?? track.duration;
        const adjustedDuration = Math.min(newDuration, maxTimelineDuration, maxOriginalDuration);
        
        onUpdate(track.id, { duration: adjustedDuration });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartTime, resizeStartDuration, track, totalDuration, onUpdate]);

  return (
    <div
      ref={setNodeRef}
      data-track-id={track.id}
      style={{
        ...style,
        left: `${trackStartPercent}%`,
        width: `${finalWidth}%`,
        top: 0,
        height: '100%',
      }}
      className="absolute group"
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 transition-colors z-30"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
        title="Drag to adjust start time"
      />
      
      {/* Track content */}
      <div
        className={`rounded px-2 py-1 text-xs truncate cursor-move transition-colors border-2 shadow-md h-full flex items-center min-w-[60px] ${
          isPlaying 
            ? "bg-primary/20 border-primary/60 text-foreground hover:bg-primary/30 shadow-lg shadow-primary/20" 
            : "bg-blue-600 border-blue-400 text-white hover:bg-blue-700"
        }`}
        title={`${track.trackName}${track.bpm ? ` • ${Math.round(track.bpm)} BPM` : ''} • Start: ${Math.floor(track.absoluteStartTime / 60)}:${(track.absoluteStartTime % 60).toString().padStart(2, "0")} • Drag to move, drag edges to resize`}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-1.5 w-full pointer-events-none">
          <GripVertical className="h-3.5 w-3.5 opacity-70 flex-shrink-0" />
          <span className="truncate flex-1 font-medium">{track.trackName}</span>
          {track.bpm && (
            <span className="opacity-90 font-semibold flex-shrink-0 text-[10px]">
              {Math.round(track.bpm)} BPM
            </span>
          )}
        </div>
      </div>
      
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-400/50 transition-colors z-30"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
        title="Drag to adjust duration"
      />
      
      {/* Controls - click track to edit */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-9 left-1/2 -translate-x-1/2 h-7 w-7 bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" onClick={(e) => e.stopPropagation()} align="center" side="top">
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="font-semibold text-base mb-1">{track.trackName}</h4>
              <p className="text-sm text-muted-foreground">
                {track.artist}
              </p>
              {track.bpm && (
                <Badge variant="outline" className="mt-2">
                  {Math.round(track.bpm)} BPM
                </Badge>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Start Time
                  </Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {Math.floor(track.absoluteStartTime / 60)}:
                    {Math.floor(track.absoluteStartTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <Slider
                  value={[track.absoluteStartTime / 60]}
                  onValueChange={handleStartTimeChange}
                  min={0}
                  max={totalDuration}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>{totalDuration}:00</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Duration
                  </Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {Math.floor(track.duration / 60)}:
                    {Math.floor(track.duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <Slider
                  value={[track.duration / 60]}
                  onValueChange={handleDurationChange}
                  min={0.5}
                  max={Math.min(
                    totalDuration - track.absoluteStartTime / 60,
                    totalDuration,
                    ((track.originalDuration ?? track.duration) / 60)
                  )}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:30</span>
                  <span>{Math.floor(Math.min(
                    totalDuration - track.absoluteStartTime / 60,
                    totalDuration,
                    ((track.originalDuration ?? track.duration) / 60)
                  ))}:00</span>
                </div>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(track.id);
                }}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Remove Track
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function TrackTimeline() {
  const { currentClass, setCurrentClass } = useTimelineStore();
  const [showTrackDialog, setShowTrackDialog] = useState(false);
  const [playlistWithFeatures, setPlaylistWithFeatures] = useState<SpotifyPlaylist | null>(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [isScrubbing, setIsScrubbing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const spotifyPlayerRef = useRef<SpotifyPlayer | null>(null);
  const [useSpotifyPlayer, setUseSpotifyPlayer] = useState(false);
  const isDraggingRef = useRef<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Re-fetch playlist with audio features when dialog opens (if authenticated)
  useEffect(() => {
    if (showTrackDialog && currentClass?.spotifyPlaylist) {
      const reFetchPlaylist = async () => {
        const authenticated = await isAuthenticated();
        if (authenticated && currentClass.spotifyPlaylist?.url) {
          try {
            const accessToken = await getStoredAccessToken();
            if (accessToken) {
              // Re-fetch with authentication to get audio features
              console.log("Re-fetching playlist with audio features...");
              const updatedPlaylist = await fetchPlaylistInfo(currentClass.spotifyPlaylist.url, true);
              console.log("Re-fetched playlist. Tracks with features:", updatedPlaylist?.tracks?.filter(t => t.bpm != null).length || 0);
              if (updatedPlaylist && updatedPlaylist.tracks && updatedPlaylist.tracks.length > 0) {
                // Check if any tracks have audio features
                const hasFeatures = updatedPlaylist.tracks.some(t => t.bpm != null || t.energy != null);
                if (hasFeatures) {
                  setPlaylistWithFeatures(updatedPlaylist);
                  // Update the class with the updated playlist
                  if (currentClass) {
                    setCurrentClass({ ...currentClass, spotifyPlaylist: updatedPlaylist });
                  }
                } else {
                  // No features found, use original playlist
                  setPlaylistWithFeatures(currentClass.spotifyPlaylist || null);
                }
              } else {
                setPlaylistWithFeatures(currentClass.spotifyPlaylist || null);
              }
            } else {
              setPlaylistWithFeatures(currentClass.spotifyPlaylist || null);
            }
          } catch (error) {
            console.error("Error re-fetching playlist:", error);
            setPlaylistWithFeatures(currentClass.spotifyPlaylist || null);
          }
        } else {
          setPlaylistWithFeatures(currentClass.spotifyPlaylist || null);
        }
      };
      reFetchPlaylist();
    }
  }, [showTrackDialog, currentClass?.spotifyPlaylist?.url, currentClass, setCurrentClass]);

  if (!currentClass || !currentClass.spotifyPlaylist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Track Timeline</CardTitle>
          <CardDescription>
            Add a Spotify playlist to map tracks to phases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No playlist added yet. Add a Spotify playlist above to start mapping tracks.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalDuration = currentClass.totalDuration;
  // Use playlist with features if available, otherwise use original
  const playlist = playlistWithFeatures || currentClass.spotifyPlaylist;
  
  // If no tracks are available, show a message
  const hasTracks = playlist?.tracks && playlist.tracks.length > 0;

  // Migrate tracks from phase-level to class-level (only once)
  useEffect(() => {
    if (!currentClass) return;
    
    // Migrate tracks from phases to class level if they exist
    if (currentClass.phases.some(p => p.tracks && p.tracks.length > 0) && !currentClass.tracks) {
      const migratedTracks: PhaseTrack[] = [];
      let absoluteTime = 0;
      
      currentClass.phases.forEach((phase) => {
        if (phase.tracks) {
          phase.tracks.forEach((track) => {
            migratedTracks.push({
              ...track,
              originalDuration: track.originalDuration || track.duration, // Preserve or set original duration
              absoluteStartTime: absoluteTime + (track.startTime || 0),
            });
          });
        }
        absoluteTime += phase.duration * 60;
      });
      
      // Update class with migrated tracks
      setCurrentClass({
        ...currentClass,
        tracks: migratedTracks,
        phases: currentClass.phases.map(p => ({ ...p, tracks: undefined })),
      });
    }
  }, [currentClass?.id]); // Only run once per class ID

  // Get tracks from class level
  const allTracks = useMemo((): TrackWithPosition[] => {
    if (!currentClass) return [];
    
    // Use class-level tracks, ensuring originalDuration is set
    const tracks = (currentClass.tracks || []).map(t => ({
      ...t,
      originalDuration: t.originalDuration || t.duration, // Ensure originalDuration is set
      phaseId: '', // No longer phase-specific
    }));
    
    // Sort by absolute start time
    return tracks.sort((a, b) => a.absoluteStartTime - b.absoluteStartTime);
  }, [currentClass?.tracks]);

  const getPhasePosition = (phase: BreathworkPhase, index: number) => {
    let startTime = 0;
    for (let i = 0; i < index; i++) {
      startTime += currentClass.phases[i].duration;
    }
    const left = (startTime / totalDuration) * 100;
    const width = (phase.duration / totalDuration) * 100;
    return { left, width, startTime };
  };

  const handleAddTrack = (track: SpotifyTrack, startTime?: number) => {
    if (!currentClass) return;

    // Find the best position: after the last track, or at the specified time
    let absoluteStartTime = 0;
    if (startTime !== undefined) {
      absoluteStartTime = startTime;
    } else if (allTracks.length > 0) {
      // Place after the last track
      const lastTrack = allTracks[allTracks.length - 1];
      absoluteStartTime = lastTrack.absoluteStartTime + lastTrack.duration;
    }

    const newTrack: PhaseTrack = {
      id: crypto.randomUUID(),
      trackId: track.id,
      trackName: track.name,
      artist: track.artist,
      duration: track.duration,
      originalDuration: track.duration, // Store original duration
      startTime: 0, // Deprecated
      absoluteStartTime: absoluteStartTime,
      imageUrl: undefined,
      previewUrl: track.previewUrl,
      // Preserve all audio features
      bpm: track.bpm,
      energy: track.energy,
      danceability: track.danceability,
      acousticness: track.acousticness,
      instrumentalness: track.instrumentalness,
      valence: track.valence,
      speechiness: track.speechiness,
    };

    const updatedTracks = [...(currentClass.tracks || []), newTrack];
    setCurrentClass({
      ...currentClass,
      tracks: updatedTracks,
    });
    setShowTrackDialog(false);
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<TrackWithPosition>) => {
    if (!currentClass) return;
    
    // Prevent updates if we're currently dragging (let drag end handle it)
    if (isDraggingRef.current === trackId && updates.absoluteStartTime !== undefined) {
      return;
    }
    
    const updatedTracks = (currentClass.tracks || []).map(t => {
      if (t.id === trackId) {
        // Preserve originalDuration when updating - never overwrite it, only set if missing
        const preservedOriginalDuration = t.originalDuration ?? (t.duration > (updates.duration || 0) ? t.duration : (updates.duration || t.duration));
        return { ...t, ...updates, originalDuration: t.originalDuration ?? preservedOriginalDuration };
      }
      return t;
    });
    
    setCurrentClass({
      ...currentClass,
      tracks: updatedTracks,
    });
  };

  const handleRemoveTrack = (trackId: string) => {
    if (!currentClass) return;
    
    const updatedTracks = (currentClass.tracks || []).filter(t => t.id !== trackId);
    setCurrentClass({
      ...currentClass,
      tracks: updatedTracks,
    });
  };

  // Collision detection and optional snapping (only when very close)
  const findSnapPosition = (trackId: string, newAbsoluteStartTime: number, tracks: TrackWithPosition[]): number => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return newAbsoluteStartTime;
    
    // Ensure position is within timeline bounds
    const maxStartTime = totalDuration * 60 - track.duration;
    const clampedStartTime = Math.max(0, Math.min(newAbsoluteStartTime, maxStartTime));
    
    // Find previous track
    const previousTracks = tracks
      .filter(t => t.id !== trackId && t.absoluteStartTime + t.duration <= clampedStartTime)
      .sort((a, b) => (b.absoluteStartTime + b.duration) - (a.absoluteStartTime + a.duration));
    
    if (previousTracks.length > 0) {
      const previousTrack = previousTracks[0];
      const snapPosition = previousTrack.absoluteStartTime + previousTrack.duration;
      // Snap if within 2 seconds
      if (Math.abs(clampedStartTime - snapPosition) < 2) {
        return Math.max(0, Math.min(snapPosition, maxStartTime));
      }
    }
    
    // Check for collisions - prevent overlapping
    const collidingTrack = tracks.find(t => 
      t.id !== trackId &&
      clampedStartTime < t.absoluteStartTime + t.duration &&
      clampedStartTime + track.duration > t.absoluteStartTime
    );
    
    if (collidingTrack) {
      // Check if we should snap to the end of the colliding track
      const snapPosition = collidingTrack.absoluteStartTime + collidingTrack.duration;
      if (Math.abs(clampedStartTime - snapPosition) < 2) {
        return Math.max(0, Math.min(snapPosition, maxStartTime));
      }
      // Position just before the colliding track
      const beforePosition = Math.max(0, collidingTrack.absoluteStartTime - track.duration);
      return Math.max(0, Math.min(beforePosition, maxStartTime));
    }
    
    return clampedStartTime;
  };

  const handleDragStart = (event: any) => {
    isDraggingRef.current = event.active.id as string;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear dragging flag
    const draggedTrackId = isDraggingRef.current;
    isDraggingRef.current = null;
    
    if (!over || !currentClass || !draggedTrackId) return;
    
    const track = allTracks.find(t => t.id === draggedTrackId);
    if (!track) return;
    
    // Use the timeline container ref if available, otherwise fallback to querySelector
    const timelineElement = timelineContainerRef.current || document.querySelector('[data-timeline-container]') as HTMLElement;
    if (!timelineElement) return;
    
    // Get the active element's current position after drag
    const activeElement = document.querySelector(`[data-track-id="${draggedTrackId}"]`) as HTMLElement;
    if (!activeElement) return;
    
    // Calculate new position based on the element's current position
    const timelineRect = timelineElement.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();
    
    // Calculate position relative to timeline
    const relativeX = activeRect.left - timelineRect.left;
    const newAbsoluteStartTime = Math.max(0, (relativeX / timelineRect.width) * (totalDuration * 60));
    
    // Apply snapping and collision detection
    const snappedPosition = findSnapPosition(draggedTrackId, newAbsoluteStartTime, allTracks);
    
    // Only update if position actually changed (prevent unnecessary updates)
    if (Math.abs(snappedPosition - track.absoluteStartTime) > 0.1) {
      handleUpdateTrack(draggedTrackId, { absoluteStartTime: snappedPosition });
    }
  };

  // Get current track based on timeline position
  const getCurrentTrack = () => {
    if (!allTracks.length) return null;
    return allTracks.find(
      (track) =>
        currentTime >= track.absoluteStartTime &&
        currentTime < track.absoluteStartTime + track.duration
    ) || null;
  };

  const currentTrack = getCurrentTrack();

  // Initialize Spotify player if authenticated
  useEffect(() => {
    const initPlayer = async () => {
      const authenticated = await isAuthenticated();
      const accessToken = await getStoredAccessToken();
      if (authenticated && accessToken) {
        try {
          console.log("Initializing Spotify player...");
          const player = await initializeSpotifyPlayer(() => getStoredAccessToken());
          spotifyPlayerRef.current = player;
          
          // Wait for player to be ready
          player.addListener("ready", ({ device_id }: { device_id: string }) => {
            console.log("Spotify player ready with device ID:", device_id);
            setUseSpotifyPlayer(true);
          });
          
          // Listen for player state changes (handled by sync interval, but keep for immediate updates)
          // The sync interval handles most of the logic to avoid stale closure issues
          
          // Listen for errors
          player.addListener("authentication_error", ({ message }: { message: string }) => {
            console.error("Spotify authentication error:", message);
            setUseSpotifyPlayer(false);
          });
          
          player.addListener("account_error", ({ message }: { message: string }) => {
            console.error("Spotify account error:", message);
            setUseSpotifyPlayer(false);
          });
        } catch (error) {
          console.error("Failed to initialize Spotify player:", error);
          setUseSpotifyPlayer(false);
        }
      } else {
        console.log("Not authenticated, using preview URLs");
        setUseSpotifyPlayer(false);
      }
    };

    initPlayer();

    return () => {
      if (spotifyPlayerRef.current) {
        disconnectSpotifyPlayer();
        spotifyPlayerRef.current = null;
      }
    };
  }, []);

  // Initialize audio element as fallback
  useEffect(() => {
    if (!useSpotifyPlayer && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        // When track ends, move to next track or stop
        const nextTrack = allTracks.find(
          (t) => t.absoluteStartTime > currentTime
        );
        if (nextTrack) {
          setCurrentTime(nextTrack.absoluteStartTime);
        } else {
          setIsPlaying(false);
        }
      });
    }
    return () => {
      if (audioRef.current && !useSpotifyPlayer) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [useSpotifyPlayer]);

  // Handle playback timer - sync with Spotify player state if available
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;

    // If using Spotify player, sync with player state instead of manual timer
    if (useSpotifyPlayer && spotifyPlayerRef.current) {
      const syncInterval = setInterval(async () => {
        // Skip if scrubbing (user is manually controlling position)
        if (isScrubbing) return;
        
        try {
          const state = await spotifyPlayerRef.current?.getCurrentState();
          if (state) {
            // Get the currently playing track from Spotify state
            const spotifyTrackId = state.track_window?.current_track?.id;
            
            // Get current track based on current timeline position
            setCurrentTime((prevTime) => {
              const track = allTracks.find(
                (t) =>
                  prevTime >= t.absoluteStartTime &&
                  prevTime < t.absoluteStartTime + t.duration
              );
              
              if (track) {
                // Check if Spotify is playing a different track than expected
                // This can happen during track transitions
                const isTrackMismatch = spotifyTrackId && track.trackId && spotifyTrackId !== track.trackId;
                
                if (isTrackMismatch) {
                  // Spotify is playing a different track - find which one
                  const actualTrack = allTracks.find(t => t.trackId === spotifyTrackId);
                  if (actualTrack) {
                    // Use the actual track that's playing
                    const trackPosition = state.position / 1000;
                    return actualTrack.absoluteStartTime + trackPosition;
                  }
                  // If we can't find the track, return previous time
                  return prevTime;
                }
                
                // Convert Spotify track position to absolute timeline position
                const trackPosition = state.position / 1000; // Convert ms to seconds
                const absoluteTime = track.absoluteStartTime + trackPosition;
                
                // Check if track has ended (position exceeds track duration)
                if (trackPosition >= track.duration) {
                  // Find next track
                  const nextTrack = allTracks.find(
                    (t) => t.absoluteStartTime > track.absoluteStartTime
                  );
                  if (nextTrack) {
                    // Move to next track - use setTimeout to avoid calling setters inside setState
                    setTimeout(() => {
                      setCurrentTrackId(null); // Force track change
                    }, 0);
                    return nextTrack.absoluteStartTime;
                  } else {
                    // No more tracks, stop playback
                    setTimeout(() => {
                      setIsPlaying(false);
                    }, 0);
                    return track.absoluteStartTime + track.duration;
                  }
                } else {
                  // Update timeline position based on track position
                  return absoluteTime;
                }
              }
              
              // If no track found, return previous time
              return prevTime;
            });
            
            setIsPlaying(!state.paused);
          }
        } catch (error) {
          console.error("Error syncing with Spotify player:", error);
        }
      }, 100);

      return () => clearInterval(syncInterval);
    }

    // Manual timer for preview URLs
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 0.1; // Update every 100ms for smooth progress
        const totalDurationSeconds = totalDuration * 60;
        
        // Stop at end of timeline
        if (newTime >= totalDurationSeconds) {
          setIsPlaying(false);
          return totalDurationSeconds;
        }
        
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, totalDuration, useSpotifyPlayer]);

  // Handle audio playback based on current track
  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      if (useSpotifyPlayer && spotifyPlayerRef.current) {
        pauseSpotifyPlayback().catch(console.error);
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    // Use Spotify player if available and authenticated
    if (useSpotifyPlayer && spotifyPlayerRef.current && currentTrack.trackId) {
      // Check if player is ready
      if (!isSpotifyPlayerReady()) {
        console.log("Spotify player not ready yet, waiting...");
        return;
      }
      
      // If track changed, load new track
      if (currentTrack.id !== currentTrackId) {
        setCurrentTrackId(currentTrack.id);
        // When switching tracks, start from the beginning of the new track
        const timeIntoTrack = Math.max(0, currentTime - currentTrack.absoluteStartTime);
        const positionMs = Math.max(0, timeIntoTrack * 1000);
        
        console.log("Playing Spotify track:", currentTrack.trackId, "at position:", positionMs, "ms");
        playSpotifyTrack(currentTrack.trackId, positionMs).catch((err) => {
          console.error("Error playing Spotify track:", err);
          // Fallback to preview if Spotify playback fails
          if (currentTrack.previewUrl && audioRef.current) {
            console.log("Falling back to preview URL");
            setUseSpotifyPlayer(false); // Switch to preview mode
            audioRef.current.src = currentTrack.previewUrl;
            audioRef.current.currentTime = Math.min(timeIntoTrack, 30);
            audioRef.current.play().catch(console.error);
          }
        });
      } else {
        // Same track - check if we need to resume
        spotifyPlayerRef.current.getCurrentState().then((state) => {
          if (state && state.paused) {
            console.log("Resuming Spotify playback");
            resumeSpotifyPlayback().catch(console.error);
          }
        }).catch(console.error);
      }
    } else if (!useSpotifyPlayer && audioRef.current) {
      // Fallback to preview URLs
      if (currentTrack.id !== currentTrackId) {
        setCurrentTrackId(currentTrack.id);
        
        if (currentTrack.previewUrl) {
          const timeIntoTrack = currentTime - currentTrack.absoluteStartTime;
          audioRef.current.src = currentTrack.previewUrl;
          audioRef.current.currentTime = Math.min(timeIntoTrack, 30); // Preview URLs are max 30 seconds
          audioRef.current.play().catch((err) => {
            console.error("Error playing audio:", err);
          });
        } else {
          // No preview URL, pause audio
          audioRef.current.pause();
        }
      } else if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
        // Resume if already loaded
        audioRef.current.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      }
    }
  }, [isPlaying, currentTrack, currentTrackId, currentTime, useSpotifyPlayer]);

  // Handle scrubbing (clicking on timeline)
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentClass) return;
    
    const timelineElement = e.currentTarget;
    const rect = timelineElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = Math.max(0, Math.min(percentage * (totalDuration * 60), totalDuration * 60));
    
    setIsScrubbing(true);
    setCurrentTime(newTime);
    
    // Find which track should be playing at this time
    const targetTrack = allTracks.find(
      (track) =>
        newTime >= track.absoluteStartTime &&
        newTime < track.absoluteStartTime + track.duration
    );
    
    // Update playback position
    if (useSpotifyPlayer && spotifyPlayerRef.current && targetTrack) {
      const timeIntoTrack = newTime - targetTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < targetTrack.duration) {
        // If we're switching tracks, play the new track
        if (targetTrack.id !== currentTrackId) {
          setCurrentTrackId(null); // Force track change
        } else {
          // Same track, just seek
          seekSpotifyPlayback(timeIntoTrack * 1000).catch(console.error);
        }
      }
    } else if (audioRef.current && targetTrack) {
      const timeIntoTrack = newTime - targetTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < targetTrack.duration) {
        // If we're switching tracks, load the new track
        if (targetTrack.id !== currentTrackId && targetTrack.previewUrl) {
          setCurrentTrackId(null); // Force track change
        } else if (targetTrack.previewUrl) {
          audioRef.current.currentTime = Math.min(timeIntoTrack, 30);
        }
      }
    }
    
    setTimeout(() => setIsScrubbing(false), 500); // Longer timeout to prevent sync override
  };

  const handlePlayPause = async () => {
    if (!isPlaying) {
      // Starting playback
      setIsPlaying(true);
    } else {
      // Pausing playback
      setIsPlaying(false);
      if (useSpotifyPlayer && spotifyPlayerRef.current) {
        await pauseSpotifyPlayback().catch(console.error);
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (useSpotifyPlayer && spotifyPlayerRef.current) {
      pauseSpotifyPlayback().catch(console.error);
      seekSpotifyPlayback(0).catch(console.error);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Calculate progress percentage
  const progressPercentage = totalDuration > 0 ? (currentTime / (totalDuration * 60)) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Track Timeline</CardTitle>
            <CardDescription>
              Map tracks from your playlist to phases
            </CardDescription>
          </div>
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              disabled={!allTracks.length}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleStop}
              disabled={!allTracks.length || currentTime === 0}
            >
              <Square className="h-4 w-4" />
            </Button>
            {currentTrack && (
              <div className="text-sm text-muted-foreground ml-2">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")} / {totalDuration}:00
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Phase Headings - Outside timeline */}
          <div className="flex items-center gap-2 mb-4">
            {currentClass?.phases.map((phase, index) => {
              const { left, width } = getPhasePosition(phase, index);
              const color = PHASE_COLORS[phase.type] || "bg-gray-500";
              
              return (
                <div
                  key={phase.id}
                  className="flex flex-col items-center gap-1.5"
                  style={{ width: `${width}%` }}
                >
                  <Badge 
                    variant="secondary" 
                    className={`${color} text-white border-0 text-sm font-medium px-3 py-1.5`}
                  >
                    {phase.name}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {phase.duration}min
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Axis */}
          <div 
            ref={timelineContainerRef}
            className="relative h-48 bg-muted rounded-lg overflow-visible cursor-pointer" 
            data-timeline-container
            onClick={handleTimelineClick}
          >
            {/* Progress Indicator - Vertical Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none transition-all"
              style={{ left: `${progressPercentage}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background" />
            </div>
            {/* Time markers - below timeline */}
            <div className="absolute inset-0 flex items-center">
              {Array.from({ length: Math.ceil(totalDuration / 2) + 1 }).map((_, i) => {
                const minutes = i * 2;
                if (minutes > totalDuration) return null;
                const x = (minutes / totalDuration) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: `${x}%` }}
                  >
                    <span className="absolute -bottom-5 left-0 text-xs text-muted-foreground whitespace-nowrap">
                      {minutes}min
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tracks layer - positioned directly on timeline (unified across all phases) */}
            {allTracks.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={allTracks.map((t) => t.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 z-20"
                  >
                    {allTracks.map((track) => (
                      <SortableTrackItem
                        key={track.id}
                        track={track}
                        totalDuration={totalDuration}
                        onUpdate={handleUpdateTrack}
                        onRemove={handleRemoveTrack}
                        allTracks={allTracks}
                        isPlaying={isPlaying && currentTrack?.id === track.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Phase segments */}
            {currentClass?.phases.map((phase, index) => {
              const { left, width, startTime } = getPhasePosition(phase, index);
              const color = PHASE_COLORS[phase.type] || "bg-gray-500";

              return (
                <div
                  key={phase.id}
                  className="absolute top-0 bottom-0 border-r-2 border-white/20"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                >
                  <div
                    className={`h-full ${color} opacity-20`}
                  />

                  {/* Breathing Hold visualization for breathing phases - at the end of the phase */}
                  {phase.type === "breathing" && phase.breathHoldDuration && phase.breathHoldDuration > 0 && (
                    <div 
                      className="absolute top-0 bottom-0 border-l-2 border-amber-400/60 bg-amber-400/20 flex flex-col items-center justify-center"
                      style={{
                        right: 0,
                        width: `${(phase.breathHoldDuration / 60 / phase.duration) * 100}%`,
                      }}
                      title={`Breath Hold: ${phase.breathHoldDuration}s`}
                    >
                      <div className="text-xs text-amber-400 font-medium">Hold</div>
                      <div className="text-xs text-amber-400/80">{phase.breathHoldDuration}s</div>
                    </div>
                  )}

                </div>
              );
            })}
            
            {/* Add Track button - inside timeline */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30">
              <Dialog open={showTrackDialog} onOpenChange={setShowTrackDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    <span className="text-xs">Add Track</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select Track</DialogTitle>
                    <DialogDescription>
                      Choose a track from your playlist to add to the timeline
                    </DialogDescription>
                  </DialogHeader>
                  <TrackSelector
                    playlistTracks={playlist?.tracks}
                    onSelect={(track) => handleAddTrack(track)}
                    onClose={() => setShowTrackDialog(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Consolidated track list */}
          <div className="mt-12">
            {allTracks.length > 0 ? (
              <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-lg">All Tracks</h4>
                <span className="text-sm text-muted-foreground">
                  {allTracks.length} track{allTracks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2">
                {allTracks.map((track) => {
                  const startMinutes = Math.floor(track.absoluteStartTime / 60);
                  const startSeconds = Math.floor(track.absoluteStartTime % 60);
                  const endTime = track.absoluteStartTime + track.duration;
                  const endMinutes = Math.floor(endTime / 60);
                  const endSeconds = Math.floor(endTime % 60);
                  
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between text-sm p-3 rounded-lg border transition-colors ${
                        isPlaying && currentTrack?.id === track.id
                          ? "bg-primary/10 border-primary"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-wrap flex-1">
                        <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{track.trackName}</span>
                          <span className="text-xs text-muted-foreground">by {track.artist}</span>
                        </div>
                        {track.bpm && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(track.bpm)} BPM
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {startMinutes}:{startSeconds.toString().padStart(2, "0")}
                          </span>
                          <span>→</span>
                          <span className="font-mono">
                            {endMinutes}:{endSeconds.toString().padStart(2, "0")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, "0")})
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemoveTrack(track.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tracks added yet. Add tracks to phases above.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
