"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BreathworkClass } from "@/types";
import { getAllClasses, deleteClass, duplicateClass, exportClassToJSON } from "@/lib/storage";
import { Plus, Edit, Copy, Trash2, Download, Calendar, Music, Activity, User, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile } from "./UserProfile";
import { SpotifyReconnectAlert } from "./SpotifyReconnectAlert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isAuthenticated, getStoredAccessToken, getSpotifyAuthUrl } from "@/lib/spotify-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ClassListProps {
  onSelectClass: (clazz: BreathworkClass) => void;
  onCreateNew: () => void;
  onPreviewClass?: (clazz: BreathworkClass) => void;
}

export function ClassList({ onSelectClass, onCreateNew, onPreviewClass }: ClassListProps) {
  const [classes, setClasses] = useState<BreathworkClass[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ imageUrl?: string; displayName: string } | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isSpotifyAuthenticated, setIsSpotifyAuthenticated] = useState(false);

  useEffect(() => {
    loadClasses();
    // Reload classes when window gets focus (in case saved from another tab)
    const handleFocus = () => loadClasses();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Check authentication status and fetch user profile for avatar
  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      // Check if user signed up via Spotify OAuth (they're already connected)
      let signedUpViaSpotify = false;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const signedViaSpotify = session?.provider_token && 
          session.user?.identities?.some(identity => identity.provider === 'spotify');
        if (signedViaSpotify) {
          signedUpViaSpotify = true;
          // Sync tokens from Supabase
          const { syncSpotifyTokensFromSupabase } = await import("@/lib/spotify-auth");
          await syncSpotifyTokensFromSupabase();
        }
      } catch (error) {
        console.error("Error checking Supabase Spotify auth:", error);
      }
      
      const authenticated = await isAuthenticated();
      setIsSpotifyAuthenticated(authenticated || signedUpViaSpotify);
      
      if (authenticated || signedUpViaSpotify) {
        try {
          const accessToken = await getStoredAccessToken();
          if (accessToken) {
            const response = await fetch("/api/spotify/user", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              setUserProfile({
                imageUrl: userData.imageUrl,
                displayName: userData.displayName,
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
    };

    checkAuthAndFetchProfile();
    
    // Check for OAuth callback in URL - this happens when user returns from Spotify
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyCode = urlParams.get("spotify_code");
    if (spotifyCode) {
      // Check immediately and then again after a short delay to ensure tokens are stored
      checkAuthAndFetchProfile();
      setTimeout(() => {
        checkAuthAndFetchProfile();
      }, 1500);
      setTimeout(() => {
        checkAuthAndFetchProfile();
      }, 3000);
    }
    
    // Listen for custom auth success event (dispatched by SpotifyAuth component)
    const handleAuthSuccess = () => {
      // Immediately check auth status when authentication succeeds
      checkAuthAndFetchProfile();
      // Also check again after a short delay to ensure everything is updated
      setTimeout(() => {
        checkAuthAndFetchProfile();
      }, 500);
    };
    window.addEventListener("spotify-auth-success", handleAuthSuccess);
    
    // Listen for storage changes (when tokens are stored in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "spotify_access_token" || e.key === "spotify_refresh_token") {
        checkAuthAndFetchProfile();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    
    // Check periodically
    const interval = setInterval(checkAuthAndFetchProfile, 2000); // Every 2 seconds for faster updates
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("spotify-auth-success", handleAuthSuccess);
    };
  }, []);

  const loadClasses = () => {
    const allClasses = getAllClasses();
    setClasses(allClasses.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleDelete = (id: string) => {
    setClassToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (classToDelete) {
      deleteClass(classToDelete);
      loadClasses();
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateClass(id);
    loadClasses();
  };

  const handleExport = (clazz: BreathworkClass) => {
    const json = exportClassToJSON(clazz);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = clazz.theme 
      ? `${clazz.theme.replace(/\s+/g, "-")}.json`
      : `breathwork-class-${clazz.id}.json`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConnectSpotify = async () => {
    try {
      const authUrl = await getSpotifyAuthUrl();
      window.location.href = authUrl;
    } catch (error: any) {
      alert(error.message || "Failed to start authentication.");
    }
  };

  // Re-check auth when window regains focus (after OAuth redirect)
  useEffect(() => {
    const handleFocus = async () => {
      const authenticated = await isAuthenticated();
      setIsSpotifyAuthenticated(authenticated);
      
      if (authenticated) {
        const accessToken = await getStoredAccessToken();
        if (accessToken) {
          try {
            const response = await fetch("/api/spotify/user", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              setUserProfile({
                imageUrl: userData.imageUrl,
                displayName: userData.displayName,
              });
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top row with logo and avatar */}
      <div className="flex items-center justify-between -mt-2 mb-4">
        <img 
          src="/somara-logo.png" 
          alt="Breathwork Journey Builder" 
          className="h-10 w-10 object-contain"
        />
        <button
          onClick={() => setProfileDialogOpen(true)}
          className="rounded-full hover:ring-2 hover:ring-primary transition-all"
        >
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage src={userProfile?.imageUrl} alt={userProfile?.displayName} />
            <AvatarFallback className="bg-muted">
              {userProfile?.displayName ? getInitials(userProfile.displayName) : <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Classes</h2>
        <div className="flex items-center gap-3">
          <Button onClick={onCreateNew} size="lg" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Class
          </Button>
        </div>
      </div>

      {/* Profile Dialog */}
      {profileDialogOpen && (
        <UserProfile onClose={() => setProfileDialogOpen(false)} />
      )}

      {/* Spotify Not Authenticated Alert - Only show if user signed up via email (not Spotify OAuth) */}
      {!isSpotifyAuthenticated && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Spotify Not Connected</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <span className="flex-1">Connect your Spotify account to access playlists and tracks.</span>
            <Button onClick={handleConnectSpotify} size="sm" className="ml-4">
              <Music className="h-4 w-4 mr-2" />
              Connect Spotify
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Spotify Reconnection Alert */}
      <SpotifyReconnectAlert />

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No classes yet. Create your first one!</p>
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {classes.map((clazz) => (
            <Card key={clazz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl mb-2">{clazz.theme || "Untitled Class"}</CardTitle>
                <CardDescription>
                  {clazz.description && (
                    <div className="mb-3 text-sm line-clamp-3">{clazz.description}</div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(clazz.updatedAt)}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Duration</div>
                    <div className="text-lg font-semibold">{clazz.totalDuration.toFixed(1)} min</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Phases</div>
                    <div className="text-lg font-semibold">{clazz.phases.length}</div>
                  </div>
                </div>

                {/* More Details */}
                <div className="pt-2 border-t space-y-2">
                  {clazz.spotifyPlaylist && (
                    <div className="flex items-center gap-2 text-sm">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Playlist:</span>
                      <span className="font-medium truncate">{clazz.spotifyPlaylist.name}</span>
                    </div>
                  )}
                  {clazz.isOnline !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {clazz.isOnline ? "Online Class" : "In-Person Class"}
                      </span>
                      {clazz.location && !clazz.isOnline && (
                        <span className="text-muted-foreground">• {clazz.location}</span>
                      )}
                    </div>
                  )}
                  {clazz.time && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{clazz.time}</span>
                    </div>
                  )}
                </div>

                {/* Phase Summary */}
                {clazz.phases.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Phase Summary</div>
                    <div className="flex flex-wrap gap-1">
                      {clazz.phases.slice(0, 6).map((phase, idx) => (
                        <div
                          key={phase.id}
                          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                        >
                          {phase.name}
                        </div>
                      ))}
                      {clazz.phases.length > 6 && (
                        <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                          +{clazz.phases.length - 6} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {onPreviewClass && (
                    <Button
                      onClick={() => onPreviewClass(clazz)}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Start Class
                    </Button>
                  )}
                  <Button
                    onClick={() => onSelectClass(clazz)}
                    variant="ghost"
                    size="sm"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDuplicate(clazz.id)}
                    variant="ghost"
                    size="sm"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleExport(clazz)}
                    variant="ghost"
                    size="sm"
                    title="Export JSON"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(clazz.id)}
                    variant="ghost"
                    size="sm"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this class? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

