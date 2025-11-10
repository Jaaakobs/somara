"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  getSpotifyAuthUrl, 
  isAuthenticated, 
  clearSpotifyAuth,
  getStoredAccessToken 
} from "@/lib/spotify-auth";
import { Music, LogOut, CheckCircle2 } from "lucide-react";

interface SpotifyAuthProps {
  onAuthChange?: (authenticated: boolean) => void;
}

export function SpotifyAuth({ onAuthChange }: SpotifyAuthProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // First check if user signed in via Supabase Spotify OAuth
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.provider_token && session.provider === 'spotify') {
          // Sync tokens from Supabase
          const { syncSpotifyTokensFromSupabase } = await import("@/lib/spotify-auth");
          await syncSpotifyTokensFromSupabase();
          setAuthenticated(true);
          onAuthChange?.(true);
          return;
        }
      } catch (error) {
        console.error("Error checking Supabase Spotify auth:", error);
      }
      
      // Fallback to checking localStorage
      const authStatus = await isAuthenticated();
      setAuthenticated(authStatus);
      onAuthChange?.(authStatus);
    };

    checkAuth();

    // Check for auth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("spotify_code");
    
    if (code) {
      handleAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAuthCallback = async (code: string) => {
    setIsLoading(true);
    try {
      const codeVerifier = localStorage.getItem("spotify_code_verifier");
      if (!codeVerifier) {
        throw new Error("Code verifier not found");
      }

      // Use 127.0.0.1 instead of localhost (Spotify requirement)
      let redirectUri = `${window.location.origin}/api/spotify/callback`;
      if (window.location.hostname === "localhost") {
        redirectUri = `http://127.0.0.1:${window.location.port}/api/spotify/callback`;
      }

      const response = await fetch("/api/spotify/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to exchange token");
      }

      const tokenData = await response.json();
      
      // Store tokens
      localStorage.setItem("spotify_access_token", tokenData.access_token);
      localStorage.setItem("spotify_token_expires_at", (Date.now() + tokenData.expires_in * 1000).toString());
      if (tokenData.refresh_token) {
        localStorage.setItem("spotify_refresh_token", tokenData.refresh_token);
      }

      setAuthenticated(true);
      onAuthChange?.(true);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("spotify-auth-success"));
    } catch (error) {
      console.error("Auth callback error:", error);
      alert("Failed to authenticate with Spotify. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      alert(error.message || "Failed to start authentication. Please check your Spotify Client ID configuration.");
    }
  };

  const handleLogout = () => {
    clearSpotifyAuth();
    setAuthenticated(false);
    onAuthChange?.(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Authenticating with Spotify...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Spotify Connection</div>
      {authenticated ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm">Connected</span>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-3 w-3 mr-1" />
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Not connected</span>
          </div>
          <Button onClick={handleLogin} size="sm">
            <Music className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </div>
      )}
    </div>
  );
}

