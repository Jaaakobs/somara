"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { BreathworkPhase } from "@/types";
import { BreathingRhythmBuilder } from "./BreathingRhythmBuilder";
import { Trash2, Waves, GripVertical } from "lucide-react";

interface SortablePhaseItemProps {
  phase: BreathworkPhase;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<BreathworkPhase>) => void;
}

const PHASE_COLORS: Record<string, string> = {
  introduction: "bg-gray-400",
  grounding: "bg-blue-500",
  breathing: "bg-purple-500",
  integration: "bg-green-500",
  custom: "bg-orange-500",
};

export function SortablePhaseItem({
  phase,
  index,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isFixed = phase.type === "introduction" || phase.type === "integration";
  const isDraggable = !isFixed;
  const color = PHASE_COLORS[phase.type] || "bg-gray-500";

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isFixed ? "opacity-75" : ""}`}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {isDraggable && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing touch-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className={`h-12 w-12 rounded-lg ${color} flex items-center justify-center text-white font-bold`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{phase.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {phase.duration} minutes
                  {phase.type === "breathing" && phase.breathHoldDuration && (
                    <span className="ml-2">• Hold: {phase.breathHoldDuration}s</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase.breathingRhythm && (
                <Waves className="h-4 w-4 text-muted-foreground" />
              )}
              {!isFixed && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isSelected && (
            <div 
              className="mt-4 pt-4 border-t space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Duration: {phase.duration} minutes</Label>
                </div>
                <Slider
                  value={[phase.duration]}
                  onValueChange={(value) => onUpdate({ duration: value[0] })}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Grounding Phase - Different Inputs */}
              {phase.type === "grounding" && (
                <div className="space-y-2">
                  <Label>Grounding Instructions</Label>
                  <Textarea
                    value={phase.groundingInstructions || ""}
                    onChange={(e) => onUpdate({ groundingInstructions: e.target.value })}
                    placeholder="Enter grounding instructions or guidance..."
                    rows={4}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Breathing Phase - Breathing Rhythm + Breath Hold */}
              {phase.type === "breathing" && (
                <>
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Label>Breathing Rhythm</Label>
                    <BreathingRhythmBuilder
                      rhythm={phase.breathingRhythm}
                      onUpdate={(rhythm) => onUpdate({ breathingRhythm: rhythm })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Breath Hold Duration: {phase.breathHoldDuration || 0} seconds</Label>
                    </div>
                    <Slider
                      value={[phase.breathHoldDuration || 0]}
                      onValueChange={(value) => onUpdate({ breathHoldDuration: value[0] })}
                      min={0}
                      max={300}
                      step={5}
                      className="w-full"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set the duration for the breath hold at the end of this breathing phase
                    </p>
                  </div>
                </>
              )}

              {/* Introduction/Integration - Just duration */}
              {(phase.type === "introduction" || phase.type === "integration") && (
                <p className="text-sm text-muted-foreground">
                  {phase.type === "introduction" 
                    ? "Introduction phase - adjust duration as needed"
                    : "Integration phase - adjust duration as needed"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

