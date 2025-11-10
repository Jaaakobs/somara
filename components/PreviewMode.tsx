"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BreathworkClass, PhaseTrack } from "@/types";
import { Play, Pause, Square, Music, SkipBack, SkipForward, RotateCcw, Volume2 } from "lucide-react";
import { isAuthenticated, getStoredAccessToken } from "@/lib/spotify-auth";
import {
  initializeSpotifyPlayer,
  isSpotifyPlayerReady,
  playSpotifyTrack,
  pauseSpotifyPlayback,
  resumeSpotifyPlayback,
  seekSpotifyPlayback,
  disconnectSpotifyPlayer,
  type SpotifyPlayer,
} from "@/lib/spotify-player";

interface PreviewModeProps {
  classData: BreathworkClass;
  onClose: () => void;
}

const PHASE_COLORS: Record<string, string> = {
  introduction: "bg-gray-400",
  grounding: "bg-blue-500",
  breathing: "bg-purple-500",
  integration: "bg-green-500",
  custom: "bg-orange-500",
};

export function PreviewMode({ classData, onClose }: PreviewModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds (absolute timeline position)
  const [isScrubbing, setIsScrubbing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const spotifyPlayerRef = useRef<SpotifyPlayer | null>(null);
  const [useSpotifyPlayer, setUseSpotifyPlayer] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold-in" | "exhale" | "hold-out">("inhale");
  const [isRepeating, setIsRepeating] = useState(false);
  const [skipAmount, setSkipAmount] = useState(5); // seconds to skip

  // Get all tracks from class level (migrate from phase-level if needed)
  const allTracks = useMemo((): PhaseTrack[] => {
    if (!classData) return [];
    
    // Use class-level tracks if available
    if (classData.tracks && classData.tracks.length > 0) {
      return classData.tracks;
    }
    
    // Migrate from phase-level tracks if they exist
    if (classData.phases.some(p => p.tracks && p.tracks.length > 0)) {
      const migratedTracks: PhaseTrack[] = [];
      let absoluteTime = 0;
      
      classData.phases.forEach((phase) => {
        if (phase.tracks) {
          phase.tracks.forEach((track) => {
            migratedTracks.push({
              ...track,
              originalDuration: track.originalDuration || track.duration,
              absoluteStartTime: absoluteTime + (track.startTime || 0),
            });
          });
        }
        absoluteTime += phase.duration * 60;
      });
      
      return migratedTracks;
    }
    
    return [];
  }, [classData?.tracks, classData?.phases]);

  // Calculate which phase we're in based on total elapsed time
  const calculatePhaseInfo = () => {
    let accumulatedTime = 0;
    let actualPhaseIndex = 0;
    let phaseTimeElapsed = 0;
    
    for (let i = 0; i < classData.phases.length; i++) {
      const phaseDuration = classData.phases[i].duration * 60;
      if (currentTime < accumulatedTime + phaseDuration) {
        actualPhaseIndex = i;
        phaseTimeElapsed = currentTime - accumulatedTime;
        break;
      }
      accumulatedTime += phaseDuration;
    }
    
    return { actualPhaseIndex, phaseTimeElapsed };
  };
  
  const { actualPhaseIndex, phaseTimeElapsed } = calculatePhaseInfo();
  const currentPhase = classData.phases[actualPhaseIndex] || classData.phases[0];
  const phaseDurationSeconds = currentPhase ? currentPhase.duration * 60 : 0;
  const phaseProgress = phaseDurationSeconds > 0 ? (phaseTimeElapsed / phaseDurationSeconds) * 100 : 0;

  // Get current track based on absolute timeline position
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
          console.log("Initializing Spotify player in PreviewMode...");
          const player = await initializeSpotifyPlayer(() => getStoredAccessToken());
          spotifyPlayerRef.current = player;
          
          // Wait for player to be ready
          player.addListener("ready", ({ device_id }: { device_id: string }) => {
            console.log("Spotify player ready with device ID:", device_id);
            setUseSpotifyPlayer(true);
          });
          
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
  }, [useSpotifyPlayer, allTracks, currentTime]);

  // Handle playback timer - sync with Spotify player state if available
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;

    // If using Spotify player, sync with player state instead of manual timer
    if (useSpotifyPlayer && spotifyPlayerRef.current) {
      const syncInterval = setInterval(async () => {
        // Skip if scrubbing
        if (isScrubbing) return;
        
        try {
          const state = await spotifyPlayerRef.current?.getCurrentState();
          if (state) {
            // Get current track based on current timeline position
            setCurrentTime((prevTime) => {
              const track = allTracks.find(
                (t) =>
                  prevTime >= t.absoluteStartTime &&
                  prevTime < t.absoluteStartTime + t.duration
              );
              
              if (track) {
                // Convert Spotify track position to absolute timeline position
                const trackPosition = state.position / 1000; // Convert ms to seconds
                const absoluteTime = track.absoluteStartTime + trackPosition;
                
                // Check if track has ended
                if (trackPosition >= track.duration) {
                  // Find next track
                  const nextTrack = allTracks.find(
                    (t) => t.absoluteStartTime > track.absoluteStartTime
                  );
                  if (nextTrack) {
                    setCurrentTrackId(null); // Force track change
                    return nextTrack.absoluteStartTime;
                  } else {
                    setIsPlaying(false);
                    return track.absoluteStartTime + track.duration;
                  }
                } else {
                  return absoluteTime;
                }
              }
              
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
        const totalDurationSeconds = classData.totalDuration * 60;
        
        // Stop at end of timeline
        if (newTime >= totalDurationSeconds) {
          setIsPlaying(false);
          return totalDurationSeconds;
        }
        
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, classData.totalDuration, useSpotifyPlayer, allTracks]);

  // Update breathing phase based on rhythm
  useEffect(() => {
    if (!currentPhase?.breathingRhythm || !isPlaying) return;
    
    const rhythm = currentPhase.breathingRhythm;
    const cycleDuration = rhythm.inhaleSeconds +
      (rhythm.holdAfterInhale || 0) +
      rhythm.exhaleSeconds +
      (rhythm.holdAfterExhale || 0);
    const cycleTime = phaseTimeElapsed % cycleDuration;

    if (cycleTime < rhythm.inhaleSeconds) {
      setBreathingPhase("inhale");
    } else if (cycleTime < rhythm.inhaleSeconds + (rhythm.holdAfterInhale || 0)) {
      setBreathingPhase("hold-in");
    } else if (
      cycleTime <
      rhythm.inhaleSeconds + (rhythm.holdAfterInhale || 0) + rhythm.exhaleSeconds
    ) {
      setBreathingPhase("exhale");
    } else {
      setBreathingPhase("hold-out");
    }
  }, [currentPhase, phaseTimeElapsed, isPlaying]);

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
        const timeIntoTrack = Math.max(0, currentTime - currentTrack.absoluteStartTime);
        const positionMs = Math.max(0, timeIntoTrack * 1000);
        
        console.log("Playing Spotify track:", currentTrack.trackId, "at position:", positionMs, "ms");
        playSpotifyTrack(currentTrack.trackId, positionMs).catch((err) => {
          console.error("Error playing Spotify track:", err);
          // Fallback to preview if Spotify playback fails
          if (currentTrack.previewUrl && audioRef.current) {
            console.log("Falling back to preview URL");
            setUseSpotifyPlayer(false);
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
          audioRef.current.pause();
        }
      } else if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
        audioRef.current.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      }
    }
  }, [isPlaying, currentTrack, currentTrackId, currentTime, useSpotifyPlayer]);

  const handlePlayPause = async () => {
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
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
    setCurrentTrackId(null);
    if (useSpotifyPlayer && spotifyPlayerRef.current) {
      pauseSpotifyPlayback().catch(console.error);
      seekSpotifyPlayback(0).catch(console.error);
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - skipAmount);
    setCurrentTime(newTime);
    
    if (useSpotifyPlayer && spotifyPlayerRef.current && currentTrack) {
      const timeIntoTrack = newTime - currentTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < currentTrack.duration) {
        seekSpotifyPlayback(timeIntoTrack * 1000).catch(console.error);
      }
    } else if (audioRef.current && currentTrack) {
      const timeIntoTrack = newTime - currentTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < currentTrack.duration) {
        audioRef.current.currentTime = Math.min(timeIntoTrack, 30);
      }
    }
  };

  const handleSkipForward = () => {
    const totalDurationSeconds = classData.totalDuration * 60;
    const newTime = Math.min(totalDurationSeconds, currentTime + skipAmount);
    setCurrentTime(newTime);
    
    if (useSpotifyPlayer && spotifyPlayerRef.current && currentTrack) {
      const timeIntoTrack = newTime - currentTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < currentTrack.duration) {
        seekSpotifyPlayback(timeIntoTrack * 1000).catch(console.error);
      }
    } else if (audioRef.current && currentTrack) {
      const timeIntoTrack = newTime - currentTrack.absoluteStartTime;
      if (timeIntoTrack >= 0 && timeIntoTrack < currentTrack.duration) {
        audioRef.current.currentTime = Math.min(timeIntoTrack, 30);
      }
    }
  };

  const handleToggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  // Handle track repeat
  useEffect(() => {
    if (!isRepeating || !currentTrack || !isPlaying) return;
    
    const checkInterval = setInterval(() => {
      if (currentTrack) {
        const timeIntoTrack = currentTime - currentTrack.absoluteStartTime;
        if (timeIntoTrack >= currentTrack.duration) {
          // Restart the track
          const newTime = currentTrack.absoluteStartTime;
          setCurrentTime(newTime);
          
          if (useSpotifyPlayer && spotifyPlayerRef.current) {
            playSpotifyTrack(currentTrack.trackId!, 0).catch(console.error);
          } else if (audioRef.current && currentTrack.previewUrl) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        }
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [isRepeating, currentTrack, currentTime, isPlaying, useSpotifyPlayer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDurationSeconds = classData.totalDuration * 60;
  const totalProgress = (currentTime / totalDurationSeconds) * 100;

  // Calculate phase positions for timeline
  const getPhasePosition = (phaseIndex: number) => {
    let startTime = 0;
    for (let i = 0; i < phaseIndex; i++) {
      startTime += classData.phases[i].duration;
    }
    const left = (startTime / classData.totalDuration) * 100;
    const width = (classData.phases[phaseIndex].duration / classData.totalDuration) * 100;
    return { left, width, startTime };
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto h-full flex flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{classData.theme || "Untitled Class"}</h2>
            {classData.description && (
              <p className="text-sm text-muted-foreground mt-1">{classData.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
              <div className="text-sm text-muted-foreground">
                / {formatTime(totalDurationSeconds)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Skip Controls */}
              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                <Button
                  onClick={handleSkipBackward}
                  variant="outline"
                  size="sm"
                  title={`Skip backward ${skipAmount}s`}
                >
                  <SkipBack className="h-4 w-4 mr-1" />
                  <span className="text-xs">{skipAmount}s</span>
                </Button>
                <Button
                  onClick={handleSkipForward}
                  variant="outline"
                  size="sm"
                  title={`Skip forward ${skipAmount}s`}
                >
                  <span className="text-xs">{skipAmount}s</span>
                  <SkipForward className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              {/* Main Playback Controls */}
              <div className="flex gap-2">
                <Button onClick={handlePlayPause} size="lg">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button onClick={handleStop} variant="outline" size="lg">
                  <Square className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleToggleRepeat}
                  variant={isRepeating ? "default" : "outline"}
                  size="lg"
                  title="Repeat current track"
                >
                  <RotateCcw className={`h-5 w-5 ${isRepeating ? "animate-spin" : ""}`} />
                </Button>
              </div>
              
              <Button onClick={onClose} variant="outline" size="lg">
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Main Content Area - Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Left Column - Main Content */}
            <div className="space-y-6 overflow-y-auto">
              {/* Current Phase Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Current Phase</h3>
                      <span className="text-sm text-muted-foreground">
                        {actualPhaseIndex + 1} / {classData.phases.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold mb-2">{currentPhase?.name}</h4>
                      <div className="w-full bg-muted rounded-full h-2 mb-4">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${phaseProgress}%` }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(phaseTimeElapsed)} / {formatTime(phaseDurationSeconds)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Breathing Rhythm Card */}
              {currentPhase?.breathingRhythm && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Breathing Rhythm</h3>
                    <div className="flex items-center justify-center">
                      <div
                        className={`h-48 w-48 rounded-full transition-all duration-300 flex items-center justify-center text-white text-2xl font-bold ${
                          breathingPhase === "inhale"
                            ? "bg-blue-500 scale-125"
                            : breathingPhase === "exhale"
                              ? "bg-purple-500 scale-75"
                              : "bg-gray-500 scale-100"
                        }`}
                      >
                        {breathingPhase === "inhale"
                          ? "INHALE"
                          : breathingPhase === "exhale"
                            ? "EXHALE"
                            : "HOLD"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Track Card */}
              {currentTrack && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Current Track</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        {currentTrack.imageUrl && (
                          <img
                            src={currentTrack.imageUrl}
                            alt={currentTrack.trackName}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{currentTrack.trackName}</div>
                          <div className="text-sm text-muted-foreground">{currentTrack.artist}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs text-muted-foreground">Now Playing</span>
                            {isRepeating && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-primary">Repeating</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(currentTrack.duration)}
                        </div>
                      </div>
                      
                      {/* Track Progress */}
                      {currentTrack && (
                        <div className="space-y-2">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  ((currentTime - currentTrack.absoluteStartTime) / currentTrack.duration) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {formatTime(Math.max(0, currentTime - currentTrack.absoluteStartTime))}
                            </span>
                            <span>{formatTime(currentTrack.duration)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Timeline */}
            <div className="space-y-4 overflow-y-auto">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-2">
                    {classData.phases.map((phase, index) => {
                      const color = PHASE_COLORS[phase.type] || "bg-gray-500";
                      const isActive = index === actualPhaseIndex;
                      
                      return (
                        <div
                          key={phase.id}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isActive
                              ? "border-primary bg-primary/10"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{phase.name}</span>
                            <span className="text-sm text-muted-foreground">{phase.duration} min</span>
                          </div>
                          {isActive && (
                            <div className="w-full bg-muted rounded-full h-1 mt-2">
                              <div
                                className="bg-primary h-1 rounded-full"
                                style={{ width: `${phaseProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Center Timeline Visualization */}
          {allTracks.length > 0 && (
            <Card className="w-full">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center">Track Timeline</h3>
                <div className="relative h-40 bg-muted rounded-lg overflow-hidden">
                  {/* Phase segments */}
                  {classData.phases.map((phase, index) => {
                    const { left, width } = getPhasePosition(index);
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
                        <div className={`h-full ${color} opacity-20`} />
                      </div>
                    );
                  })}
                  
                  {/* Tracks */}
                  {allTracks.map((track) => {
                    const trackStartPercent = (track.absoluteStartTime / 60 / classData.totalDuration) * 100;
                    const trackWidthPercent = (track.duration / 60 / classData.totalDuration) * 100;
                    const isCurrentTrack = currentTrack?.id === track.id;
                    
                    return (
                      <div
                        key={track.id}
                        className={`absolute top-1/2 -translate-y-1/2 h-10 rounded px-2 flex items-center text-xs truncate border-2 transition-colors ${
                          isCurrentTrack
                            ? "bg-primary/20 border-primary/60 text-foreground"
                            : "bg-blue-600 border-blue-400 text-white"
                        }`}
                        style={{
                          left: `${trackStartPercent}%`,
                          width: `${Math.max(2, trackWidthPercent)}%`,
                        }}
                        title={`${track.trackName}${track.bpm ? ` • ${Math.round(track.bpm)} BPM` : ''}`}
                      >
                        <Music className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate font-medium">{track.trackName}</span>
                      </div>
                    );
                  })}
                  
                  {/* Progress indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none transition-all"
                    style={{ left: `${totalProgress}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
