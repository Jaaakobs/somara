// Spotify OAuth configuration
// Note: You'll need to set up a Spotify App at https://developer.spotify.com/dashboard
// For local development, use: http://127.0.0.1:3000/api/spotify/callback
// For production, use: https://yourdomain.com/api/spotify/callback
// Note: localhost is NOT allowed - must use 127.0.0.1 for local development

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

// Get redirect URI - use 127.0.0.1 for localhost, otherwise use the origin
function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  
  // If running on localhost, use 127.0.0.1 instead (Spotify requirement)
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://127.0.0.1:${window.location.port}/api/spotify/callback`;
  }
  
  // For production or other hosts, use the origin
  return `${window.location.origin}/api/spotify/callback`;
}

const SPOTIFY_REDIRECT_URI = getRedirectUri();

// Generate code verifier and challenge for PKCE
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function getSpotifyAuthUrl(): Promise<string> {
  if (!SPOTIFY_CLIENT_ID) {
    throw new Error("Spotify Client ID not configured. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in your .env file");
  }

  const verifier = generateCodeVerifier();
  if (typeof window !== "undefined") {
    localStorage.setItem("spotify_code_verifier", verifier);
  }

  const challenge = await generateCodeChallenge(verifier);
  
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: "playlist-read-private playlist-read-collaborative user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state",
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) return null;

  try {
    const response = await fetch("/api/spotify/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token");
      clearSpotifyAuth();
      return null;
    }

    const tokenData = await response.json();
    storeAccessToken(tokenData.access_token, tokenData.expires_in, tokenData.refresh_token);
    return tokenData.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    clearSpotifyAuth();
    return null;
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  
  if (!token || !expiresAt) return null;
  
  // Check if token is expired or will expire in the next 5 minutes
  const expirationTime = parseInt(expiresAt);
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  
  if (Date.now() > expirationTime) {
    // Token is expired, try to refresh
    console.log("Token expired, attempting to refresh...");
    return await refreshAccessToken();
  } else if (fiveMinutesFromNow > expirationTime) {
    // Token will expire soon, refresh proactively
    console.log("Token expiring soon, refreshing proactively...");
    return await refreshAccessToken();
  }
  
  return token;
}

export function storeAccessToken(token: string, expiresIn: number, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem("spotify_access_token", token);
  localStorage.setItem("spotify_token_expires_at", expiresAt.toString());
  
  if (refreshToken) {
    localStorage.setItem("spotify_refresh_token", refreshToken);
  }
}

export function clearSpotifyAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_token_expires_at");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_code_verifier");
  localStorage.removeItem("spotify_code_challenge");
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredAccessToken();
  return token !== null;
}

