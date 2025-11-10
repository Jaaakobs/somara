"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {

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
              onClick={() => window.location.href = '/signin'}
              size="lg" 
              className="flex items-center gap-2"
            >
              Get Started
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

