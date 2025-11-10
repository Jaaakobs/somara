"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isAuthenticated } from "@/lib/spotify-auth";

// Spotify logo SVG component
const SpotifyLogo = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

export default function ConnectSpotifyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated and if Spotify is already connected
  useEffect(() => {
    const supabase = createClient();
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Not authenticated, redirect to signin
          router.push("/signin");
          return;
        }

        // Check for Spotify callback code
        const urlParams = new URLSearchParams(window.location.search);
        const spotifyCode = urlParams.get("spotify_code");
        
        if (spotifyCode) {
          setIsChecking(false);
          setIsLoading(true);
          // Handle Spotify OAuth callback
          try {
            const { handleSpotifyCallback, getStoredAccessToken } = await import("@/lib/spotify-auth");
            const success = await handleSpotifyCallback(spotifyCode);
            if (success) {
              // Successfully connected, fetch Spotify profile and update Supabase user
              try {
                const accessToken = await getStoredAccessToken();
                if (accessToken) {
                  // Fetch Spotify user profile
                  const userResponse = await fetch("/api/spotify/user", {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  });

                  if (userResponse.ok) {
                    const spotifyUser = await userResponse.json();
                    
                    // Update profile table with Spotify integration data
                    const { updateProfileWithSpotify } = await import("@/lib/profiles");
                    await updateProfileWithSpotify(
                      spotifyUser.id,
                      spotifyUser.displayName,
                      spotifyUser.imageUrl
                    );
                  }
                }
              } catch (err) {
                console.error("Error updating user profile:", err);
                // Don't fail the connection if profile update fails
              }

              // Redirect to home
              router.push("/home");
              return;
            } else {
              setError("Failed to connect Spotify account. Please try again.");
              setIsLoading(false);
            }
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err) {
            console.error("Error handling Spotify callback:", err);
            setError("Failed to connect Spotify account. Please try again.");
            setIsLoading(false);
          }
          return;
        }

        // Check if Spotify is already connected (check profiles table first, then localStorage)
        const { isSpotifyConnected } = await import("@/lib/profiles");
        const spotifyConnected = await isSpotifyConnected() || await isAuthenticated();
        if (spotifyConnected) {
          // Already connected, redirect to home
          router.push("/home");
          return;
        }

        setIsChecking(false);
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/signin");
      }
    };

    // Listen for auth state changes (especially sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/signin');
      }
    });

    checkAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleConnectSpotify = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Use the existing Spotify auth flow
      const { getSpotifyAuthUrl } = await import("@/lib/spotify-auth");
      const authUrl = await getSpotifyAuthUrl();
      
      if (authUrl) {
        // Redirect to Spotify OAuth
        window.location.href = authUrl;
        // Don't set loading to false - we're redirecting
      } else {
        setError("Failed to generate Spotify authentication URL. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error connecting Spotify:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg relative z-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <SpotifyLogo />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Connect Your Spotify Account</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            To use Somara, you need to connect your Spotify account. This allows us to access your playlists and music.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Connect Button */}
          <Button
            type="button"
            onClick={handleConnectSpotify}
            className="w-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <SpotifyLogo />
            {isLoading ? "Connecting..." : "Connect Spotify"}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By connecting, you agree to allow Somara to access your Spotify account.
          </p>
        </div>
      </div>
    </div>
  );
}

