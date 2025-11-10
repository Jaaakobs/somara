"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthCodeError() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has a session despite the error
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('User has session, redirecting to app');
        router.push('/');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            There was an error during the authentication process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please try signing in again. If the problem persists, make sure:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
            <li>You authorized the app to access your Spotify account</li>
            <li>Your email is verified (check your inbox for a verification email)</li>
            <li>
              <strong>The redirect URL is added to Supabase Dashboard:</strong>
              <br />
              Go to: <code className="text-xs bg-muted px-1 py-0.5 rounded">Supabase Dashboard → Authentication → URL Configuration</code>
              <br />
              Add this URL to "Redirect URLs": <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:3000/auth/callback</code>
            </li>
          </ul>
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/">Try Again</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

