"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStoredAccessToken, isAuthenticated, clearSpotifyAuth, getSpotifyAuthUrl } from "@/lib/spotify-auth";
import { User, Mail, Globe, Crown, Users, Music, LogOut, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpotifyAuth } from "./SpotifyAuth";
import { createClient } from "@/lib/supabase/client";

interface SpotifyUser {
  id: string;
  displayName: string;
  email: string;
  imageUrl?: string;
  followers: number;
  country?: string;
  product: string; // "premium" or "free"
}

interface UserProfileProps {
  onClose?: () => void;
}

export function UserProfile({ onClose }: UserProfileProps = {}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [signedUpViaSpotify, setSignedUpViaSpotify] = useState(false);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const accessToken = await getStoredAccessToken();
      if (!accessToken) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/spotify/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Authentication expired. Please reconnect to Spotify.");
        } else {
          setError("Failed to fetch user profile");
        }
        setIsLoading(false);
        return;
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Error fetching user profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase auth first
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUser(session.user);
        
        // Check if user signed up via Spotify OAuth
        const signedViaSpotify = session.provider_token && 
          session.user?.identities?.some(identity => identity.provider === 'spotify');
        setSignedUpViaSpotify(!!signedViaSpotify);
        
        // If user signed in via Spotify OAuth, sync tokens and fetch Spotify profile
        if (signedViaSpotify) {
          try {
            const { syncSpotifyTokensFromSupabase } = await import('@/lib/spotify-auth');
            await syncSpotifyTokensFromSupabase();
            // Fetch Spotify profile since they're already connected
            const authStatus = await isAuthenticated();
            setAuthenticated(authStatus);
            if (authStatus && isOpen && !user) {
              fetchUserProfile();
            }
          } catch (error) {
            console.error('Error syncing Spotify tokens:', error);
          }
        } else {
          // User signed up via email, check if they've connected Spotify separately
          const authStatus = await isAuthenticated();
          setAuthenticated(authStatus);
          if (authStatus && isOpen && !user) {
            fetchUserProfile();
          }
        }
      } else {
        setSupabaseUser(null);
        setSignedUpViaSpotify(false);
      }
    };
    checkAuth();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && authenticated && !user) {
      fetchUserProfile();
    }
  }, [isOpen, authenticated]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      
      // Sign out from Supabase
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error signing out:', signOutError);
        setError('Failed to sign out. Please try again.');
        setIsLoggingOut(false);
        return;
      }
      
      // Clear Spotify auth as well
      clearSpotifyAuth();
      
      // Close the dialog
      setIsOpen(false);
      if (onClose) {
        onClose();
      }
      
      // Redirect to landing page
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error during logout:', err);
      setError('An error occurred during logout. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Profile</DialogTitle>
            <DialogDescription>Your account information and settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Unified Profile - Show Spotify info if available, otherwise Supabase info */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading profile...</p>
              </div>
            ) : error ? (
              <div className="p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : (
              <>
                {/* If user has Spotify profile (signed up via Spotify or connected), show that */}
                {user ? (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user.imageUrl} alt={user.displayName} />
                      <AvatarFallback className="text-lg">
                        {getInitials(user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">{user.displayName}</h3>
                      {user.product === "premium" && (
                        <div className="flex items-center justify-center gap-1 text-xs text-primary">
                          <Crown className="h-3 w-3" />
                          <span>Premium</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full space-y-3 pt-4 border-t">
                      {user.email && (
                        <div className="flex items-center justify-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.email}</span>
                        </div>
                      )}
                      
                      {user.country && (
                        <div className="flex items-center justify-center gap-3 text-sm">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{user.country}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-center gap-3 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {user.followers.toLocaleString()} followers
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Fallback to Supabase user info if no Spotify profile */
                  supabaseUser && (
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={supabaseUser.user_metadata?.avatar_url} alt={supabaseUser.email} />
                        <AvatarFallback className="text-lg">
                          {supabaseUser.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold">
                          {supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User'}
                        </h3>
                        {supabaseUser.email && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{supabaseUser.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </>
            )}

            {/* Spotify Connection - Only show if user signed up via email (not via Spotify OAuth) */}
            {!signedUpViaSpotify && (
              <div className="pt-4 border-t">
                <SpotifyAuth onAuthChange={(auth) => {
                  setAuthenticated(auth);
                  if (auth && isOpen) {
                    fetchUserProfile();
                  } else {
                    setUser(null);
                  }
                }} />
              </div>
            )}
            
            {/* Show connection status if signed up via Spotify */}
            {signedUpViaSpotify && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Spotify Connected</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Via OAuth</span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            {supabaseUser && (
              <div className="pt-4 border-t">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isLoggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
  );
}

