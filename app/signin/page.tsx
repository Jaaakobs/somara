"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

// Door/entry icon SVG
const EntryIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

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

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is already authenticated, redirect to app
          router.push("/home");
          router.refresh();
        } else {
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        setIsCheckingAuth(false);
      }
    };

    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuth();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Verify environment variables are loaded
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase env vars:', {
          url: supabaseUrl ? 'set' : 'missing',
          key: supabaseAnonKey ? 'set' : 'missing'
        });
        setError("Supabase configuration is missing. Please check your .env.local file and restart the dev server.");
        setIsLoading(false);
        return;
      }
      
      console.log('Supabase config:', {
        url: supabaseUrl,
        keyLength: supabaseAnonKey?.length || 0
      });

      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          setError(signUpError.message || "Failed to sign up. Please check your credentials and try again.");
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Check if email confirmation is required
          if (data.session) {
            // User is immediately signed in (email confirmation disabled)
            router.push("/home");
            router.refresh();
          } else {
            // Email confirmation required
            setError(
              "Please check your email to confirm your account before signing in."
            );
            setIsLoading(false);
          }
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setIsLoading(false);
          return;
        }

        if (data.session) {
          router.push("/home");
          router.refresh();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleSpotifyAuth = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/home`;

      console.log('Initiating Spotify OAuth with redirectTo:', redirectTo);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        console.error('Spotify OAuth error:', oauthError);
        setError(`Failed to sign in with Spotify: ${oauthError.message}`);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        console.log('Redirecting to Spotify:', data.url);
        // Redirect to Spotify OAuth page
        window.location.href = data.url;
        // Don't set loading to false - we're redirecting
      } else {
        console.error('No OAuth URL received from Supabase');
        setError("No OAuth URL received from Supabase. Please check your Spotify configuration in Supabase Dashboard.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Exception during Spotify OAuth:', err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg relative z-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full border-2 border-foreground flex items-center justify-center">
              <EntryIcon />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Welcome to Somara</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Please sign in or sign up below.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
                minLength={6}
              />
            </div>

            {/* Continue with Email Button */}
            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Continue with Email"}
            </Button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Spotify OAuth Button */}
          <Button
            type="button"
            onClick={handleSpotifyAuth}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            <SpotifyLogo />
            Sign in with Spotify
          </Button>
        </div>
      </div>
    </div>
  );
}

