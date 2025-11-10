import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  spotify_user_id: string | null;
  spotify_connected: boolean;
  spotify_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error getting profile:", error);
    return null;
  }
}

/**
 * Update user profile with Spotify integration data
 */
export async function updateProfileWithSpotify(
  spotifyUserId: string,
  displayName?: string,
  avatarUrl?: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      console.error("No session found");
      return false;
    }

    const updateData: {
      spotify_user_id: string;
      spotify_connected: boolean;
      spotify_connected_at: string;
      display_name?: string;
      avatar_url?: string;
    } = {
      spotify_user_id: spotifyUserId,
      spotify_connected: true,
      spotify_connected_at: new Date().toISOString(),
    };

    if (displayName) {
      updateData.display_name = displayName;
    }

    if (avatarUrl) {
      updateData.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error updating profile with Spotify:", error);
      return false;
    }

    // Also update user metadata for backward compatibility
    if (displayName) {
      await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          display_name: displayName,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
}

/**
 * Check if user has Spotify connected
 */
export async function isSpotifyConnected(): Promise<boolean> {
  try {
    const profile = await getCurrentUserProfile();
    return profile?.spotify_connected ?? false;
  } catch (error) {
    console.error("Error checking Spotify connection:", error);
    return false;
  }
}

/**
 * Disconnect Spotify from profile
 */
export async function disconnectSpotify(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        spotify_user_id: null,
        spotify_connected: false,
        spotify_connected_at: null,
      })
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error disconnecting Spotify:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error disconnecting Spotify:", error);
    return false;
  }
}

