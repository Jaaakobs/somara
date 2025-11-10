"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useTimelineStore } from "@/lib/store";
import { BreathworkClass, PhaseType, ClassType } from "@/types";
import { Plus, Trash2, Waves, GripVertical, ChevronDown, ChevronUp, Music, X, Monitor, MapPin, Users } from "lucide-react";
import { BreathingRhythmBuilder } from "./BreathingRhythmBuilder";
import { getSpotifyEmbedUrl } from "@/lib/spotify";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortablePhaseItem } from "./SortablePhaseItem";
import { TrackTimeline } from "./TrackTimeline";
import { SpotifyPlaylistDialog } from "./SpotifyPlaylistDialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SimpleClassFormProps {
  initialClass?: BreathworkClass;
  onSave: (clazz: BreathworkClass) => void;
  onCancel?: () => void;
}

const PHASE_TYPES: { value: PhaseType; label: string; color: string }[] = [
  { value: "grounding", label: "Grounding", color: "bg-blue-500" },
  { value: "breathing", label: "Breathing", color: "bg-purple-500" },
  { value: "custom", label: "Custom", color: "bg-orange-500" },
];

const PHASE_COLORS: Record<PhaseType, string> = {
  introduction: "bg-gray-400",
  grounding: "bg-blue-500",
  breathing: "bg-purple-500",
  integration: "bg-green-500",
  custom: "bg-orange-500",
};

export function SimpleClassForm({ initialClass, onSave, onCancel }: SimpleClassFormProps) {
  const { currentClass, setCurrentClass, addPhase, updatePhase, deletePhase, setSelectedPhase, selectedPhaseId, reorderPhases } = useTimelineStore();
  const [theme, setTheme] = useState(initialClass?.theme || "");
  const [description, setDescription] = useState(initialClass?.description || "");
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [classType, setClassType] = useState<ClassType | undefined>(initialClass?.classType);
  const [location, setLocation] = useState(initialClass?.location || "");
  const [date, setDate] = useState(initialClass?.date || "");
  const [time, setTime] = useState(initialClass?.time || "");
  const [capacity, setCapacity] = useState(initialClass?.capacity?.toString() || "");
  const [selectedPhaseType, setSelectedPhaseType] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (initialClass) {
      setCurrentClass(initialClass);
      setTheme(initialClass.theme || "");
      setDescription(initialClass.description || "");
      setClassType(initialClass.classType);
      setLocation(initialClass.location || "");
      setDate(initialClass.date || "");
      setTime(initialClass.time || "");
      setCapacity(initialClass.capacity?.toString() || "");
    } else {
      const newClass: BreathworkClass = {
        id: crypto.randomUUID(),
        theme: "",
        totalDuration: 0,
        phases: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setCurrentClass(newClass);
    }
  }, [initialClass?.id]);

  const handleSave = () => {
    if (!currentClass) return;

    const clazz: BreathworkClass = {
      ...currentClass,
      id: initialClass?.id || currentClass.id,
      theme: theme.trim() || undefined,
      description: description.trim() || undefined,
      classType: classType,
      location: location.trim() || undefined,
      date: date.trim() || undefined,
      time: time.trim() || undefined,
      capacity: capacity ? parseInt(capacity, 10) : undefined,
      createdAt: initialClass?.createdAt || currentClass.createdAt,
      updatedAt: Date.now(),
    };

    setCurrentClass(clazz);
    onSave(clazz);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderPhases(active.id as string, over.id as string);
    }
  };

  const totalDuration = currentClass?.totalDuration || 0;
  const selectedPhase = currentClass?.phases.find((p) => p.id === selectedPhaseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Class Details</CardTitle>
          <CardDescription>Enter basic information for your breathwork class</CardDescription>
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
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for your class..."
              rows={4}
            />
          </div>

          {/* More Options */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full justify-between"
            >
              <span>More Options</span>
              {showMoreOptions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {showMoreOptions && (
              <div className="space-y-4 pt-2 border-t">
                {/* Class Type */}
                <div className="space-y-2">
                  <Label htmlFor="class-type">Class Type</Label>
                  <Select
                    value={classType || ""}
                    onValueChange={(value) => setClassType(value as ClassType)}
                  >
                    <SelectTrigger id="class-type" className="w-full">
                      <SelectValue placeholder="Select class type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online" className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Online</span>
                      </SelectItem>
                      <SelectItem value="physical" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>Physical</span>
                      </SelectItem>
                      <SelectItem value="hybrid" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Hybrid</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location - show for physical and hybrid */}
                {(classType === "physical" || classType === "hybrid") && (
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Studio Name, Address"
                    />
                  </div>
                )}

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Capacity</span>
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Maximum number of participants"
                    className="w-full"
                  />
                </div>

              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phases */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Phases</CardTitle>
              <CardDescription>Add phases to your class - you can add multiple breathing phases</CardDescription>
            </div>
            <Select
              value={selectedPhaseType}
              onValueChange={(value) => {
                addPhase(value as PhaseType);
                setSelectedPhaseType(""); // Reset to allow adding another phase immediately
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
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
        </CardHeader>
        <CardContent className="space-y-4">
          {currentClass?.phases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No phases yet. Click "Add Phase" to get started.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentClass?.phases.map((p) => p.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {currentClass?.phases.map((phase, index) => (
                    <SortablePhaseItem
                      key={phase.id}
                      phase={phase}
                      index={index}
                      isSelected={selectedPhaseId === phase.id}
                      onSelect={() => setSelectedPhase(selectedPhaseId === phase.id ? null : phase.id)}
                      onDelete={() => deletePhase(phase.id)}
                      onUpdate={(updates) => updatePhase(phase.id, updates)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <div className="flex items-center justify-between rounded-lg bg-muted p-4 mt-4">
            <span className="text-sm font-medium">Total Duration</span>
            <span className="text-2xl font-bold">{totalDuration.toFixed(1)} min</span>
          </div>
        </CardContent>
      </Card>

      {/* Spotify Music */}
      <Card>
        <CardHeader>
          <CardTitle>Spotify Music</CardTitle>
          <CardDescription>Add a playlist or track for your entire class</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentClass?.spotifyPlaylist ? (
            <div className="space-y-4">
              {/* Selected Playlist Display */}
              {/* Playlist Header - Minimal design without cover */}
              <div className="relative border rounded-xl p-6 bg-muted/30">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xl mb-1">{currentClass.spotifyPlaylist.name}</h4>
                    {currentClass.spotifyPlaylist.totalDuration && (
                      <p className="text-sm text-muted-foreground">
                        {Math.round(currentClass.spotifyPlaylist.totalDuration / 60)} min
                        {currentClass.spotifyPlaylist.tracks && currentClass.spotifyPlaylist.tracks.length > 0 && (
                          <> • {currentClass.spotifyPlaylist.tracks.length} track{currentClass.spotifyPlaylist.tracks.length !== 1 ? "s" : ""}</>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (currentClass) {
                        setCurrentClass({ ...currentClass, spotifyPlaylist: undefined });
                      }
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Change Playlist Button */}
                <div className="flex justify-end">
                  <SpotifyPlaylistDialog
                    playlist={currentClass?.spotifyPlaylist}
                    onUpdate={(playlist) => {
                      if (currentClass) {
                        setCurrentClass({ ...currentClass, spotifyPlaylist: playlist });
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Embedded Spotify Player - Clean, prominent display */}
              <div className="rounded-xl overflow-hidden bg-black/20 border">
                <iframe
                  src={getSpotifyEmbedUrl(currentClass.spotifyPlaylist.url)}
                  width="100%"
                  height="352"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                />
              </div>
            </div>
          ) : (
            <SpotifyPlaylistDialog
              playlist={currentClass?.spotifyPlaylist}
              onUpdate={(playlist) => {
                if (currentClass) {
                  setCurrentClass({ ...currentClass, spotifyPlaylist: playlist });
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Track Timeline */}
      {currentClass?.spotifyPlaylist && <TrackTimeline />}

      {/* Save Button */}
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

