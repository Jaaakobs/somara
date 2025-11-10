"use client";

import { useRouter, useParams } from "next/navigation";
import { PreviewMode } from "@/components/PreviewMode";
import { getClassById } from "@/lib/storage";
import { BreathworkClass } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export default function PreviewClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [currentClass, setCurrentClass] = useState<BreathworkClass | null>(null);
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

  // Load class data
  useEffect(() => {
    if (classId && !isCheckingAuth) {
      const clazz = getClassById(classId);
      if (clazz) {
        setCurrentClass(clazz);
      } else {
        // Class not found, redirect to home
        router.push('/home')
      }
    }
  }, [classId, isCheckingAuth, router])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentClass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading class...</p>
        </div>
      </div>
    )
  }

  return <PreviewMode classData={currentClass} onClose={() => router.push('/home')} />;
}

