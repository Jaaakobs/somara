"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getStoredAccessToken } from "@/lib/spotify-auth";
import { AlertCircle, Music } from "lucide-react";

export function SpotifyReconnectAlert() {
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      
      // Check if there's a refresh token stored
      const refreshToken = localStorage.getItem("spotify_refresh_token");
      const accessToken = localStorage.getItem("spotify_access_token");
      
      if (!refreshToken && !accessToken) {
        // No tokens at all - not connected, no alert needed
        setNeedsReconnect(false);
        setIsChecking(false);
        return;
      }

      if (!refreshToken && accessToken) {
        // Has access token but no refresh token - might need reconnect
        // Try to get the token (which will check expiration)
        const token = await getStoredAccessToken();
        if (!token) {
          setNeedsReconnect(true);
        } else {
          setNeedsReconnect(false);
        }
        setIsChecking(false);
        return;
      }

      // Has refresh token - try to refresh to see if it's still valid
      if (refreshToken) {
        try {
          const token = await getStoredAccessToken();
          if (!token) {
            // Token refresh failed - refresh token is invalid/expired
            setNeedsReconnect(true);
          } else {
            // Token is valid
            setNeedsReconnect(false);
          }
        } catch (error) {
          // Refresh failed
          setNeedsReconnect(true);
        }
      }
      
      setIsChecking(false);
    };

    checkConnection();
    
    // Check periodically (every 5 minutes)
    const interval = setInterval(checkConnection, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReconnect = async () => {
    // Redirect to Spotify auth
    const { getSpotifyAuthUrl } = await import("@/lib/spotify-auth");
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      alert(error.message || "Failed to start authentication.");
    }
  };

  if (isChecking || !needsReconnect) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Spotify Reconnection Required</AlertTitle>
      <AlertDescription className="flex items-center justify-between mt-2">
        <span className="flex-1">Your Spotify connection has expired. Please reconnect to continue using Spotify features.</span>
        <Button onClick={handleReconnect} size="sm" className="ml-4">
          <Music className="h-4 w-4 mr-2" />
          Reconnect
        </Button>
      </AlertDescription>
    </Alert>
  );
}

