"use client";

import { useRouter } from "next/navigation";
import { SimpleClassForm } from "@/components/SimpleClassForm";
import { Button } from "@/components/ui/button";
import { BreathworkClass } from "@/types";
import { saveClass } from "@/lib/storage";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export default function CreateClassPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount and listen for sign-out
  useEffect(() => {
    const supabase = createClient()
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/')
          return
        }
      } catch (err) {
        console.error('Exception during auth check:', err)
        router.push('/')
      } finally {
        setIsCheckingAuth(false)
      }
    }

    // Listen for auth state changes (especially sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/')
      }
    })

    checkAuth()

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSave = (clazz: BreathworkClass) => {
    saveClass(clazz);
    // Redirect to home after saving
    router.push('/home')
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
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={() => router.push('/home')} variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Button>
        </div>

        <SimpleClassForm
          onSave={handleSave}
          onCancel={() => router.push('/home')}
        />
      </div>
    </div>
  );
}

