"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface LandingPageProps {
  onEnterApp: () => void;
}

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

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const handleSignIn = async () => {
    const supabase = createClient()
    
    const redirectTo = `${window.location.origin}/auth/callback`
    console.log('Starting OAuth flow with redirectTo:', redirectTo)
    console.log('Window location origin:', window.location.origin)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo,
      },
    })

    if (error) {
      console.error('Supabase OAuth error:', error)
      alert(`Failed to sign in with Spotify: ${error.message}`)
      return
    }

    if (data?.url) {
      console.log('OAuth URL received, redirecting to:', data.url.substring(0, 100) + '...')
      // Supabase handles the redirect automatically
      window.location.href = data.url
    } else {
      console.error('No OAuth URL received from Supabase')
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-2xl">
          <h1 className="text-[20px] font-sans font-bold tracking-tight">
            Build and Soundtrack
            <br />
            Your Breathwork Journeys
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Create, structure, and time your breathwork classes — aligning each phase with music and breathing rhythms.
          </p>
          <div className="pt-4 flex justify-center">
            <Button 
              onClick={handleSignIn} 
              size="lg" 
              className="flex items-center gap-2"
            >
              <SpotifyLogo />
              Sign-in with Spotify
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 px-6">
        <div className="container mx-auto flex justify-center gap-4">
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs text-muted-foreground hover:underline transition-all"
          >
            Terms
          </Link>
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs text-muted-foreground hover:underline transition-all"
          >
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}

