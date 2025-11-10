"use client";

import { useState, useEffect } from "react";
import { ClassList } from "@/components/ClassList";
import { SimpleClassForm } from "@/components/SimpleClassForm";
import { PreviewMode } from "@/components/PreviewMode";
import { LandingPage } from "@/components/LandingPage";
import { Button } from "@/components/ui/button";
import { BreathworkClass } from "@/types";
import { saveClass, getClassById } from "@/lib/storage";
import { useTimelineStore } from "@/lib/store";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type View = "landing" | "list" | "create" | "edit" | "preview";

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [currentClassId, setCurrentClassId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentClass, setCurrentClass } = useTimelineStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('Auth check - Session:', session ? 'exists' : 'none', 'Error:', error)
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        if (session) {
          console.log('User authenticated, redirecting to app')
          console.log('Session user:', session.user?.email)
          
          // Sync Spotify tokens from Supabase if user signed in via Spotify OAuth
          if (session.provider_token && session.provider === 'spotify') {
            try {
              const { syncSpotifyTokensFromSupabase } = await import('@/lib/spotify-auth')
              await syncSpotifyTokensFromSupabase()
              console.log('Synced Spotify tokens from Supabase')
            } catch (error) {
              console.error('Error syncing Spotify tokens:', error)
            }
          }
          
          setIsAuthenticated(true)
          setView("list")
        } else {
          console.log('No session, showing landing page')
          setIsAuthenticated(false)
          setView("landing")
        }
      } catch (err) {
        console.error('Exception during auth check:', err)
        setIsAuthenticated(false)
        setView("landing")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'session exists' : 'no session')
      
      // Sync Spotify tokens from Supabase if user signed in via Spotify OAuth
      if (session?.provider_token && session.provider === 'spotify') {
        try {
          const { syncSpotifyTokensFromSupabase } = await import('@/lib/spotify-auth')
          await syncSpotifyTokensFromSupabase()
          console.log('Synced Spotify tokens from Supabase')
        } catch (error) {
          console.error('Error syncing Spotify tokens:', error)
        }
      }
      
      // Handle specific events
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          console.log('Auth state change - User authenticated, redirecting to app')
          console.log('Session user:', session.user?.email)
          setIsAuthenticated(true)
          setView("list")
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (session) {
          console.log('Auth state change - User still has session after SIGNED_OUT event')
          setIsAuthenticated(true)
          setView("list")
        } else {
          console.log('Auth state change - No session, showing landing page')
          setIsAuthenticated(false)
          setView("landing")
        }
      } else if (session) {
        console.log('Auth state change - User authenticated, redirecting to app')
        setIsAuthenticated(true)
        setView("list")
      } else {
        console.log('Auth state change - No session, showing landing page')
        setIsAuthenticated(false)
        setView("landing")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (currentClassId) {
      const clazz = getClassById(currentClassId);
      if (clazz) {
        setCurrentClass(clazz);
      }
    }
  }, [currentClassId, setCurrentClass]);

  const handleCreateNew = () => {
    setCurrentClassId(null);
    setCurrentClass(null);
    setView("create");
  };

  const handleSelectClass = (clazz: BreathworkClass) => {
    setCurrentClassId(clazz.id);
    setCurrentClass(clazz);
    setView("edit");
  };

  const handlePreviewClass = (clazz: BreathworkClass) => {
    setCurrentClassId(clazz.id);
    setCurrentClass(clazz);
    setView("preview");
  };

  const handleEnterApp = () => {
    setView("list");
  };

  const handleSave = (clazz: BreathworkClass) => {
    saveClass(clazz);
    setCurrentClass(clazz);
    setCurrentClassId(clazz.id);
    // Trigger refresh of class list
    setRefreshKey(prev => prev + 1);
    // Redirect to list view after saving
    setView("list");
  };

  if (view === "preview" && currentClass) {
    return <PreviewMode classData={currentClass} onClose={() => setView("list")} />;
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="min-h-screen relative">
        <div className="container mx-auto p-6 relative z-10">
          <div className="mb-6 flex items-center justify-between">
            <Button onClick={() => setView("list")} variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </Button>
            {view === "edit" && currentClass && (
              <Button
                onClick={() => setView("preview")}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Session
              </Button>
            )}
          </div>

          <SimpleClassForm
            initialClass={currentClass || undefined}
            onSave={handleSave}
            onCancel={view === "create" ? () => setView("list") : undefined}
          />
        </div>
      </div>
    );
  }

  // Check for error in URL params and hash
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const hash = window.location.hash
    
    // Check for errors in hash (Supabase OAuth errors)
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const hashError = hashParams.get('error')
      const errorCode = hashParams.get('error_code')
      const errorDescription = hashParams.get('error_description')
      
      if (hashError) {
        console.error('Auth error from hash:', hashError, errorCode, errorDescription)
        
        // Handle email verification error - this is common with OAuth providers
        if (errorCode === 'provider_email_needs_verification') {
          // User was created but email needs verification
          // Still allow them to sign in - check if they have a session
          const supabase = createClient()
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              // User has a session, allow them to proceed
              console.log('User has session despite email verification error, allowing access')
              setIsAuthenticated(true)
              setView("list")
            } else {
              // No session, show helpful message
              alert('Your account was created, but your email needs verification. Please check your email and verify your account, then try signing in again.')
            }
          })
        } else if (hashError === 'access_denied') {
          // User denied access
          alert('You need to authorize the app to access your Spotify account. Please try again and make sure to click "Agree" when prompted.')
        } else {
          // Other error
          alert(`Authentication error: ${errorDescription || hashError}`)
        }
        
        // Clean up URL hash
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }
    }
    
    // Check for errors in query params
    if (error) {
      console.error('Auth error from URL:', error)
      const message = urlParams.get('message')
      
      // If we're on the error page, check if user has a session anyway
      if (window.location.pathname === '/auth/auth-code-error') {
        const supabase = createClient()
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            // User has a session, redirect to app
            console.log('User has session, redirecting to app')
            setIsAuthenticated(true)
            setView("list")
            window.history.replaceState({}, document.title, '/')
          }
        })
      }
      
      if (message) {
        const decodedMessage = decodeURIComponent(message)
        alert(`Authentication error: ${decodedMessage}`)
      } else if (error === 'access_denied') {
        alert('You need to authorize the app to access your Spotify account. Please try again and make sure to click "Agree" when prompted.')
      } else {
        alert(`Authentication error: ${error}`)
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (view === "landing") {
    return <LandingPage onEnterApp={handleEnterApp} />;
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
