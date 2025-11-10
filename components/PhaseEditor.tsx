"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreathworkPhase, PhaseType } from "@/types";
import { BreathingRhythmBuilder } from "./BreathingRhythmBuilder";
import { X } from "lucide-react";

interface PhaseEditorProps {
  phase: BreathworkPhase;
  phaseNumber: number;
  onUpdate: (updates: Partial<BreathworkPhase>) => void;
  onRemove: () => void;
}

const PHASE_TYPES: { value: PhaseType; label: string }[] = [
  { value: "introduction", label: "Introduction" },
  { value: "grounding", label: "Grounding" },
  { value: "breathing", label: "Breathing" },
  { value: "integration", label: "Integration" },
  { value: "custom", label: "Custom" },
];

export function PhaseEditor({ phase, phaseNumber, onUpdate, onRemove }: PhaseEditorProps) {
  const [duration, setDuration] = useState(phase.duration);

  const handleDurationChange = (value: number[]) => {
    const newDuration = value[0];
    setDuration(newDuration);
    onUpdate({ duration: newDuration });
  };

  const handleTypeChange = (type: PhaseType) => {
    const typeLabel = PHASE_TYPES.find((t) => t.value === type)?.label || type;
    onUpdate({ type, name: type === "custom" ? phase.name : typeLabel });
  };

  const phaseTypeLabel = PHASE_TYPES.find((t) => t.value === phase.type)?.label || phase.type;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Phase {phaseNumber}: {phase.name}
          </CardTitle>
          <Button onClick={onRemove} variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Phase Type</Label>
            <Select value={phase.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {phase.type === "custom" && (
            <div className="space-y-2">
              <Label htmlFor={`phase-name-${phase.id}`}>Custom Phase Name</Label>
              <Input
                id={`phase-name-${phase.id}`}
                value={phase.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Enter phase name"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration: {duration} minutes</Label>
            </div>
            <Slider
              value={[duration]}
              onValueChange={handleDurationChange}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="mb-4 block">Breathing Rhythm</Label>
          <BreathingRhythmBuilder
            rhythm={phase.breathingRhythm}
            onUpdate={(rhythm) => onUpdate({ breathingRhythm: rhythm })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

