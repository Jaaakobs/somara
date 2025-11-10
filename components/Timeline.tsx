"use client";

import { BreathworkClass, BreathworkPhase } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface TimelineProps {
  classData: BreathworkClass;
  onPhaseDurationChange?: (phaseId: string, duration: number) => void;
  interactive?: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  introduction: "bg-gray-400",
  grounding: "bg-blue-500",
  breathing: "bg-purple-500",
  integration: "bg-green-500",
  custom: "bg-orange-500",
};

export function Timeline({ classData, onPhaseDurationChange, interactive = false }: TimelineProps) {
  const totalDuration = classData.totalDuration || classData.phases.reduce((sum, p) => sum + p.duration, 0);

  const getPhasePercentage = (phase: BreathworkPhase) => {
    return (phase.duration / totalDuration) * 100;
  };

  const getPhaseColor = (phase: BreathworkPhase) => {
    return PHASE_COLORS[phase.type] || PHASE_COLORS.custom;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Timeline Overview</h3>
            <p className="text-sm text-muted-foreground">
              Total Duration: {totalDuration} minutes
            </p>
            {classData.spotifyPlaylist && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>🎵</span>
                <span>{classData.spotifyPlaylist.name}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {classData.phases.map((phase, index) => {
              const percentage = getPhasePercentage(phase);
              const color = getPhaseColor(phase);
              const cumulativePercentage =
                classData.phases.slice(0, index).reduce((sum, p) => sum + getPhasePercentage(p), 0);

              return (
                <div key={phase.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${color}`} />
                      <span className="font-medium">{phase.name}</span>
                    </div>
                    <span className="text-muted-foreground">{phase.duration} min</span>
                  </div>

                  {interactive && onPhaseDurationChange ? (
                    <div className="space-y-2">
                      <Slider
                        value={[phase.duration]}
                        onValueChange={(value) => onPhaseDurationChange(phase.id, value[0])}
                        min={1}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="relative h-12 w-full rounded-lg overflow-hidden bg-muted">
                      <div
                        className={`absolute h-full ${color} transition-all`}
                        style={{
                          left: `${cumulativePercentage}%`,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative h-16 w-full rounded-lg overflow-hidden bg-muted border-2 border-border">
            {classData.phases.map((phase, index) => {
              const percentage = getPhasePercentage(phase);
              const color = getPhaseColor(phase);
              const cumulativePercentage =
                classData.phases.slice(0, index).reduce((sum, p) => sum + getPhasePercentage(p), 0);

              return (
                <div
                  key={phase.id}
                  className={`absolute h-full ${color} transition-all flex items-center justify-center text-white text-xs font-medium`}
                  style={{
                    left: `${cumulativePercentage}%`,
                    width: `${percentage}%`,
                  }}
                  title={`${phase.name} - ${phase.duration} min`}
                >
                  {percentage > 10 && (
                    <span className="truncate px-2">{phase.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

