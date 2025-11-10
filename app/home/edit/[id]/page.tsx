"use client";

import { useRouter, useParams } from "next/navigation";
import { SimpleClassForm } from "@/components/SimpleClassForm";
import { Button } from "@/components/ui/button";
import { BreathworkClass } from "@/types";
import { saveClass, getClassById } from "@/lib/storage";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const [currentClass, setCurrentClass] = useState<BreathworkClass | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
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

    checkAuth()
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

  if (!currentClass) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading class...</p>
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
          <Button
            onClick={() => router.push(`/home/preview/${classId}`)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Session
          </Button>
        </div>

        <SimpleClassForm
          initialClass={currentClass}
          onSave={handleSave}
          onCancel={() => router.push('/home')}
        />
      </div>
    </div>
  );
}

