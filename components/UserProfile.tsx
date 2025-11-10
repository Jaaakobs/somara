"use client";

import { useState, useEffect } from "react";
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
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

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
      const authStatus = await isAuthenticated();
      setAuthenticated(authStatus);
      if (authStatus && isOpen && !user) {
        fetchUserProfile();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your Profile</DialogTitle>
            <DialogDescription>Your account information and settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {authenticated ? (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">Loading profile...</p>
                  </div>
                ) : error ? (
                  <div className="p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                ) : user ? (
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
                ) : null}
              </>
            ) : null}

            {/* Spotify Connection - Compact */}
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
          </div>
        </DialogContent>
      </Dialog>
  );
}

