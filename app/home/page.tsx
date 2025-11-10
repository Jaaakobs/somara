"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClassList } from "@/components/ClassList";
import { BreathworkClass } from "@/types";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const supabase = createClient()
    let hasSession = false
    let checkCount = 0
    const maxChecks = 5

    // Listen for auth state changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change on /home:', event, session ? 'has session' : 'no session')
      
      if (event === 'SIGNED_IN' && session) {
        hasSession = true
        console.log('User signed in, session:', session.user?.email)
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
        setIsCheckingAuth(false)
      } else if (event === 'SIGNED_OUT' && !session) {
        hasSession = false
        router.push('/')
      } else if (session) {
        hasSession = true
        setIsCheckingAuth(false)
      }
    })

    // Then check for existing session with retries
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('Session check on /home:', session ? 'has session' : 'no session', 'error:', error)
        
        if (session) {
          hasSession = true
          console.log('Session found, user:', session.user?.email)
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
          setIsCheckingAuth(false)
        } else if (!hasSession && checkCount < maxChecks) {
          // Retry checking for session (cookies might not be set yet)
          checkCount++
          console.log(`No session found, retrying... (${checkCount}/${maxChecks})`)
          setTimeout(() => {
            checkAuth()
          }, 500)
        } else if (!hasSession) {
          // After max retries, redirect to landing page
          console.log('No session after retries, redirecting to landing page')
          router.push('/')
        }
      } catch (err) {
        console.error('Error checking session:', err)
        if (!hasSession && checkCount >= maxChecks) {
          router.push('/')
        }
      }
    }

    // Wait a bit for cookies to be available after redirect
    setTimeout(() => {
      checkAuth()
    }, 200)

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSelectClass = (clazz: BreathworkClass) => {
    router.push(`/home/edit/${clazz.id}`)
  };

  const handleCreateNew = () => {
    router.push('/home/create')
  };

  const handlePreviewClass = (clazz: BreathworkClass) => {
    router.push(`/home/preview/${clazz.id}`)
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto p-6 relative z-10">
        <ClassList 
          key={refreshKey} 
          onSelectClass={handleSelectClass} 
          onCreateNew={handleCreateNew}
          onPreviewClass={handlePreviewClass}
        />
      </div>
    </div>
  );
}
