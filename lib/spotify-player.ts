// Spotify Web Playback SDK integration
// This allows playing full tracks (requires Premium account)

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }
}

export interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (state: any) => void) => void;
  removeListener: (event: string, callback: (state: any) => void) => void;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
}

export interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      uri: string;
      name: string;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
      artists: Array<{ name: string }>;
    };
    next_tracks: Array<any>;
    previous_tracks: Array<any>;
  };
}

let playerInstance: SpotifyPlayer | null = null;
let isPlayerReady = false;
let playerReadyCallbacks: Array<() => void> = [];
let deviceId: string | null = null;

function setDeviceId(id: string): void {
  deviceId = id;
}

async function getDeviceId(): Promise<string> {
  if (deviceId) {
    return deviceId;
  }

  // Try to get device ID from available devices
  const accessToken = localStorage.getItem("spotify_access_token");
  if (!accessToken) {
    return "";
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const webDevice = data.devices?.find((d: any) => d.type === "Computer");
      if (webDevice && webDevice.id) {
        deviceId = webDevice.id;
        return webDevice.id;
      }
    }
  } catch (error) {
    console.error("Error fetching devices:", error);
  }

  // Fallback: don't specify device_id, Spotify will use active device
  return "";
}

export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Spotify SDK"));
    document.body.appendChild(script);
  });
}

export async function initializeSpotifyPlayer(
  getAccessToken: () => Promise<string | null> | string | null
): Promise<SpotifyPlayer> {
  if (playerInstance && isPlayerReady) {
    return playerInstance;
  }

  // Load SDK if not already loaded
  await loadSpotifySDK();

  if (!window.Spotify) {
    throw new Error("Spotify SDK not available");
  }

  // Create new player instance
  playerInstance = new window.Spotify.Player({
    name: "Breathwork Class Player",
    getOAuthToken: async (cb) => {
      const tokenResult = getAccessToken();
      const token = await Promise.resolve(tokenResult);
      if (token) {
        cb(token);
      }
    },
    volume: 0.5,
  });

  // Set up ready event listener
  playerInstance.addListener("ready", ({ device_id }: { device_id: string }) => {
    console.log("Spotify player ready with device ID:", device_id);
    setDeviceId(device_id);
    isPlayerReady = true;
    playerReadyCallbacks.forEach((cb) => cb());
    playerReadyCallbacks = [];
  });

  // Set up error event listener
  playerInstance.addListener("not_ready", ({ device_id }: { device_id: string }) => {
    console.log("Spotify player not ready. Device ID:", device_id);
    isPlayerReady = false;
  });

  // Connect to Spotify
  const connected = await playerInstance.connect();
  if (!connected) {
    throw new Error("Failed to connect to Spotify player");
  }

  return playerInstance;
}

export function getSpotifyPlayer(): SpotifyPlayer | null {
  return playerInstance;
}

export function isSpotifyPlayerReady(): boolean {
  return isPlayerReady && playerInstance !== null;
}

export async function playSpotifyTrack(trackId: string, positionMs: number = 0): Promise<void> {
  if (!playerInstance) {
    throw new Error("Spotify player not initialized");
  }

  if (!isPlayerReady) {
    throw new Error("Spotify player not ready. Please wait for the player to initialize.");
  }

  const accessToken = localStorage.getItem("spotify_access_token");
  if (!accessToken) {
    throw new Error("No access token available");
  }

  const deviceId = await getDeviceId();
  const url = deviceId 
    ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
    : "https://api.spotify.com/v1/me/player/play";

  console.log("Calling Spotify API to play track:", trackId, "on device:", deviceId || "active device");

  // Use Spotify Web API to start playback
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: [`spotify:track:${trackId}`],
      position_ms: positionMs,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Spotify API error:", response.status, errorText);
    throw new Error(`Failed to play track (${response.status}): ${errorText}`);
  }

  console.log("Successfully started playback");
}


export async function pauseSpotifyPlayback(): Promise<void> {
  if (!playerInstance || !isPlayerReady) {
    return;
  }

  await playerInstance.pause();
}

export async function resumeSpotifyPlayback(): Promise<void> {
  if (!playerInstance || !isPlayerReady) {
    return;
  }

  await playerInstance.resume();
}

export async function seekSpotifyPlayback(positionMs: number): Promise<void> {
  if (!playerInstance || !isPlayerReady) {
    return;
  }

  await playerInstance.seek(positionMs);
}

export function disconnectSpotifyPlayer(): void {
  if (playerInstance) {
    playerInstance.disconnect();
    playerInstance = null;
    isPlayerReady = false;
  }
}

