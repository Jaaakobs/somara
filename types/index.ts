export type BreathingType = 
  | "conscious-connected"
  | "box-breathing"
  | "ratio-2-1"
  | "custom";

export type PhaseType = 
  | "introduction"
  | "grounding"
  | "breathing"
  | "integration"
  | "custom";

export interface BreathingRhythm {
  type: BreathingType;
  inhaleSeconds: number;
  exhaleSeconds: number;
  holdAfterInhale?: number;
  holdAfterExhale?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl?: string;
  url: string;
  tracks?: SpotifyTrack[];
  totalDuration?: number; // in seconds
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  duration: number; // in seconds
  previewUrl?: string;
  // Audio features from Spotify API
  bpm?: number; // tempo - beats per minute
  energy?: number; // 0.0 to 1.0 - intensity and activity
  danceability?: number; // 0.0 to 1.0 - rhythm regularity
  acousticness?: number; // 0.0 to 1.0 - confidence track is acoustic
  instrumentalness?: number; // 0.0 to 1.0 - predicts if track has no vocals
  valence?: number; // 0.0 to 1.0 - musical positiveness
  speechiness?: number; // 0.0 to 1.0 - presence of spoken words
}

export interface PhaseTrack {
  id: string;
  trackId: string;
  trackName: string;
  artist: string;
  duration: number; // in seconds, current duration (can be shortened but not extended beyond originalDuration)
  originalDuration: number; // in seconds, original track length from Spotify
  startTime: number; // in seconds, absolute position on timeline (deprecated - use absoluteStartTime)
  absoluteStartTime: number; // in seconds, absolute position on timeline
  imageUrl?: string;
  previewUrl?: string;
  // Audio features from Spotify API
  bpm?: number; // tempo - beats per minute
  energy?: number; // 0.0 to 1.0 - intensity and activity
  danceability?: number; // 0.0 to 1.0 - rhythm regularity
  acousticness?: number; // 0.0 to 1.0 - confidence track is acoustic
  instrumentalness?: number; // 0.0 to 1.0 - predicts if track has no vocals
  valence?: number; // 0.0 to 1.0 - musical positiveness
  speechiness?: number; // 0.0 to 1.0 - presence of spoken words
}

export interface BreathworkPhase {
  id: string;
  type: PhaseType;
  name: string;
  duration: number; // in minutes
  breathingRhythm?: BreathingRhythm;
  breathHoldDuration?: number; // in seconds, for breathing phases with hold
  customTypeName?: string;
  // For grounding phase - different inputs
  groundingInstructions?: string;
  tracks?: PhaseTrack[]; // Deprecated - tracks are now stored at class level
}

export interface BreathworkClass {
  id: string;
  theme?: string;
  description?: string;
  totalDuration: number; // in minutes
  phases: BreathworkPhase[];
  spotifyPlaylist?: SpotifyPlaylist;
  tracks?: PhaseTrack[]; // Tracks for the entire timeline (absolute positions)
  // More options
  isOnline?: boolean;
  location?: string;
  time?: string;
  createdAt: number;
  updatedAt: number;
}

