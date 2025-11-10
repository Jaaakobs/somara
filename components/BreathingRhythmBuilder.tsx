"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { BreathingRhythm, BreathingType } from "@/types";

interface BreathingRhythmBuilderProps {
  rhythm?: BreathingRhythm;
  onUpdate: (rhythm: BreathingRhythm) => void;
}

const BREATHING_TYPES: { value: BreathingType; label: string; defaults: Partial<BreathingRhythm> }[] = [
  {
    value: "conscious-connected",
    label: "Conscious Connected (Continuous)",
    defaults: { inhaleSeconds: 4, exhaleSeconds: 4 },
  },
  {
    value: "box-breathing",
    label: "Box Breathing (4-4-4-4)",
    defaults: { inhaleSeconds: 4, exhaleSeconds: 4, holdAfterInhale: 4, holdAfterExhale: 4 },
  },
  {
    value: "ratio-2-1",
    label: "2:1 Ratio (In 4s, Out 8s)",
    defaults: { inhaleSeconds: 4, exhaleSeconds: 8 },
  },
  {
    value: "custom",
    label: "Custom",
    defaults: { inhaleSeconds: 4, exhaleSeconds: 4 },
  },
];

export function BreathingRhythmBuilder({ rhythm, onUpdate }: BreathingRhythmBuilderProps) {

  const currentRhythm: BreathingRhythm = rhythm || {
    type: "conscious-connected",
    inhaleSeconds: 4,
    exhaleSeconds: 4,
  };

  const handleTypeChange = (type: BreathingType) => {
    const typeConfig = BREATHING_TYPES.find((t) => t.value === type);
    if (typeConfig) {
      onUpdate({
        type,
        inhaleSeconds: typeConfig.defaults.inhaleSeconds || 4,
        exhaleSeconds: typeConfig.defaults.exhaleSeconds || 4,
        holdAfterInhale: typeConfig.defaults.holdAfterInhale,
        holdAfterExhale: typeConfig.defaults.holdAfterExhale,
      });
    }
  };

  const handleInhaleChange = (value: number[]) => {
    onUpdate({ ...currentRhythm, inhaleSeconds: value[0] });
  };

  const handleExhaleChange = (value: number[]) => {
    onUpdate({ ...currentRhythm, exhaleSeconds: value[0] });
  };

  const handleHoldInhaleChange = (value: number[]) => {
    onUpdate({ ...currentRhythm, holdAfterInhale: value[0] });
  };

  const handleHoldExhaleChange = (value: number[]) => {
    onUpdate({ ...currentRhythm, holdAfterExhale: value[0] });
  };

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Label>Breathing Type</Label>
        <Select value={currentRhythm.type} onValueChange={handleTypeChange}>
          <SelectTrigger onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BREATHING_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Inhale: {currentRhythm.inhaleSeconds}s</Label>
          </div>
          <Slider
            value={[currentRhythm.inhaleSeconds]}
            onValueChange={handleInhaleChange}
            min={1}
            max={20}
            step={0.5}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Exhale: {currentRhythm.exhaleSeconds}s</Label>
          </div>
          <Slider
            value={[currentRhythm.exhaleSeconds]}
            onValueChange={handleExhaleChange}
            min={1}
            max={20}
            step={0.5}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {(currentRhythm.holdAfterInhale !== undefined || currentRhythm.holdAfterExhale !== undefined) && (
          <>
            {currentRhythm.holdAfterInhale !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hold After Inhale: {currentRhythm.holdAfterInhale}s</Label>
                </div>
                <Slider
                  value={[currentRhythm.holdAfterInhale]}
                  onValueChange={handleHoldInhaleChange}
                  min={0}
                  max={20}
                  step={0.5}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {currentRhythm.holdAfterExhale !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Hold After Exhale: {currentRhythm.holdAfterExhale}s</Label>
                </div>
                <Slider
                  value={[currentRhythm.holdAfterExhale]}
                  onValueChange={handleHoldExhaleChange}
                  min={0}
                  max={20}
                  step={0.5}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

