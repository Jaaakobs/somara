"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BreathworkClass, PhaseType } from "@/types";
import { PhaseEditor } from "./PhaseEditor";

interface ClassFormProps {
  initialClass?: BreathworkClass;
  onSave: (clazz: BreathworkClass) => void;
  onCancel?: () => void;
}

export function ClassForm({ initialClass, onSave, onCancel }: ClassFormProps) {
  const [theme, setTheme] = useState(initialClass?.theme || "");
  const [phases, setPhases] = useState(initialClass?.phases || []);

  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

  const handleAddPhase = () => {
    const newPhase = {
      id: crypto.randomUUID(),
      type: "grounding" as PhaseType,
      name: "New Phase",
      duration: 5,
    };
    setPhases([...phases, newPhase]);
  };

  const handleUpdatePhase = (id: string, updates: Partial<typeof phases[0]>) => {
    setPhases(phases.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleRemovePhase = (id: string) => {
    setPhases(phases.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    const clazz: BreathworkClass = {
      id: initialClass?.id || crypto.randomUUID(),
      theme: theme.trim() || undefined,
      totalDuration,
      phases,
      createdAt: initialClass?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(clazz);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>Enter the basic information for your breathwork class</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Energy & Clarity"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <span className="text-sm font-medium">Total Duration</span>
            <span className="text-2xl font-bold">{totalDuration} min</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Phases</CardTitle>
              <CardDescription>Add and configure each phase of your class</CardDescription>
            </div>
            <Button onClick={handleAddPhase} size="sm">
              Add Phase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {phases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No phases yet. Click "Add Phase" to get started.
            </div>
          ) : (
            phases.map((phase, index) => (
              <PhaseEditor
                key={phase.id}
                phase={phase}
                phaseNumber={index + 1}
                onUpdate={(updates) => handleUpdatePhase(phase.id, updates)}
                onRemove={() => handleRemovePhase(phase.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="flex-1">
          Save Class
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

