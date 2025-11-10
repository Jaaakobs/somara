"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    // If we have a code parameter, redirect to callback route
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      // Redirect to callback route to handle the OAuth code
      router.push(`/auth/callback?code=${code}&next=/home`)
      return
    }

    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const signedViaSpotify = session.provider_token && 
            session.user?.identities?.some(identity => identity.provider === 'spotify');
          if (signedViaSpotify) {
            try {
              const { syncSpotifyTokensFromSupabase } = await import('@/lib/spotify-auth')
              await syncSpotifyTokensFromSupabase()
            } catch (error) {
              console.error('Error syncing Spotify tokens:', error)
            }
          }
          
          if (window.location.pathname !== '/home') {
            router.push('/home')
          }
        }
      } catch (err) {
        // Ignore errors
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const signedViaSpotify = session.provider_token && 
          session.user?.identities?.some(identity => identity.provider === 'spotify');
        if (signedViaSpotify) {
          try {
            const { syncSpotifyTokensFromSupabase } = await import('@/lib/spotify-auth')
            await syncSpotifyTokensFromSupabase()
          } catch (error) {
            console.error('Error syncing Spotify tokens:', error)
          }
        }
        if (window.location.pathname !== '/home') {
          router.push('/home')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <LandingPage onEnterApp={() => router.push('/signin')} />;
}
