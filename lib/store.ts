import { create } from "zustand";
import { BreathworkClass, BreathworkPhase, PhaseType } from "@/types";

interface TimelineStore {
  currentClass: BreathworkClass | null;
  selectedPhaseId: string | null;
  
  setCurrentClass: (clazz: BreathworkClass | null) => void;
  setSelectedPhase: (phaseId: string | null) => void;
  addPhase: (type: PhaseType) => void;
  updatePhase: (phaseId: string, updates: Partial<BreathworkPhase>) => void;
  deletePhase: (phaseId: string) => void;
  reorderPhases: (activeId: string, overId: string) => void;
  updateTotalDuration: () => void;
}

const PHASE_NAMES: Record<PhaseType, string> = {
  introduction: "Introduction",
  grounding: "Grounding",
  breathing: "Breathing",
  integration: "Integration",
  custom: "Custom",
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  currentClass: null,
  selectedPhaseId: null,

  setCurrentClass: (clazz) => {
    if (clazz && clazz.phases.length === 0) {
      // Add default Introduction and Integration phases
      const introductionPhase: BreathworkPhase = {
        id: crypto.randomUUID(),
        type: "introduction",
        name: "Introduction",
        duration: 3,
      };
      
      const integrationPhase: BreathworkPhase = {
        id: crypto.randomUUID(),
        type: "integration",
        name: "Integration",
        duration: 5,
      };
      
      clazz = {
        ...clazz,
        phases: [introductionPhase, integrationPhase],
      };
    }
    // Remove title if it exists (migration from old format)
    if (clazz && 'title' in clazz) {
      const { title, ...rest } = clazz as any;
      clazz = rest as BreathworkClass;
    }
    set({ currentClass: clazz, selectedPhaseId: null });
    if (clazz) {
      get().updateTotalDuration();
    }
  },

  setSelectedPhase: (phaseId) => set({ selectedPhaseId: phaseId }),

  addPhase: (type) => {
    const state = get();
    if (!state.currentClass) return;

    // Don't allow adding introduction or integration - they're fixed
    if (type === "introduction" || type === "integration") return;

    let phaseName = PHASE_NAMES[type];
    
    // Numberize breathing phases based on their order
    if (type === "breathing") {
      const breathingPhases = state.currentClass.phases.filter(
        (p) => p.type === "breathing"
      );
      const breathingNumber = breathingPhases.length + 1;
      phaseName = `Breathing Round ${breathingNumber}`;
    }

    const newPhase: BreathworkPhase = {
      id: crypto.randomUUID(),
      type,
      name: phaseName,
      duration: 5,
    };

    // Add breathing rhythm for breathing phases
    if (type === "breathing") {
      newPhase.breathingRhythm = {
        type: "conscious-connected",
        inhaleSeconds: 4,
        exhaleSeconds: 4,
      };
    }

    // Insert before integration phase (which should be last)
    const integrationIndex = state.currentClass.phases.findIndex(
      (p) => p.type === "integration"
    );
    
    let updatedPhases: BreathworkPhase[];
    if (integrationIndex >= 0) {
      updatedPhases = [
        ...state.currentClass.phases.slice(0, integrationIndex),
        newPhase,
        ...state.currentClass.phases.slice(integrationIndex),
      ];
    } else {
      updatedPhases = [...state.currentClass.phases, newPhase];
    }

    // Renumber all breathing phases after adding a new one
    let breathingIndex = 1;
    updatedPhases = updatedPhases.map((p) => {
      if (p.type === "breathing") {
        return { ...p, name: `Breathing Round ${breathingIndex++}` };
      }
      return p;
    });

    const updatedClass: BreathworkClass = {
      ...state.currentClass,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    set({ currentClass: updatedClass });
    get().updateTotalDuration();
  },

  updatePhase: (phaseId, updates) => {
    const state = get();
    if (!state.currentClass) return;

    let updatedPhases = state.currentClass.phases.map((p) =>
      p.id === phaseId ? { ...p, ...updates } : p
    );

    // Renumber breathing phases if order changed
    const breathingPhases = updatedPhases.filter((p) => p.type === "breathing");
    if (breathingPhases.length > 0) {
      let breathingIndex = 1;
      updatedPhases = updatedPhases.map((p) => {
        if (p.type === "breathing") {
          return { ...p, name: `Breathing Round ${breathingIndex++}` };
        }
        return p;
      });
    }

    const updatedClass: BreathworkClass = {
      ...state.currentClass,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    set({ currentClass: updatedClass });
    get().updateTotalDuration();
  },

  deletePhase: (phaseId) => {
    const state = get();
    if (!state.currentClass) return;

    // Don't allow deleting introduction or integration phases
    const phase = state.currentClass.phases.find((p) => p.id === phaseId);
    if (phase && (phase.type === "introduction" || phase.type === "integration")) {
      return;
    }

    let updatedPhases = state.currentClass.phases.filter((p) => p.id !== phaseId);

    // Renumber breathing phases after deletion
    let breathingIndex = 1;
    updatedPhases = updatedPhases.map((p) => {
      if (p.type === "breathing") {
        return { ...p, name: `Breathing Round ${breathingIndex++}` };
      }
      return p;
    });

    const updatedClass: BreathworkClass = {
      ...state.currentClass,
      phases: updatedPhases,
      updatedAt: Date.now(),
    };

    set({ currentClass: updatedClass, selectedPhaseId: null });
    get().updateTotalDuration();
  },

  reorderPhases: (activeId, overId) => {
    const state = get();
    if (!state.currentClass) return;

    const phases = [...state.currentClass.phases];
    const activeIndex = phases.findIndex((p) => p.id === activeId);
    const overIndex = phases.findIndex((p) => p.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const activePhase = phases[activeIndex];
    const overPhase = phases[overIndex];

    // Don't allow moving introduction or integration
    if (activePhase.type === "introduction" || activePhase.type === "integration") {
      return;
    }
    if (overPhase.type === "introduction" || overPhase.type === "integration") {
      return;
    }

    // Ensure introduction stays first and integration stays last
    const introductionIndex = phases.findIndex((p) => p.type === "introduction");
    const integrationIndex = phases.findIndex((p) => p.type === "integration");

    // Calculate new index, but respect boundaries
    let newIndex = overIndex;
    if (newIndex <= introductionIndex) {
      newIndex = introductionIndex + 1;
    }
    if (newIndex >= integrationIndex) {
      newIndex = integrationIndex - 1;
    }

    // Remove active phase and insert at new position
    phases.splice(activeIndex, 1);
    phases.splice(newIndex, 0, activePhase);

    // Renumber breathing phases after reordering
    let breathingIndex = 1;
    const renumberedPhases = phases.map((p) => {
      if (p.type === "breathing") {
        return { ...p, name: `Breathing Round ${breathingIndex++}` };
      }
      return p;
    });

    const updatedClass: BreathworkClass = {
      ...state.currentClass,
      phases: renumberedPhases,
      updatedAt: Date.now(),
    };

    set({ currentClass: updatedClass });
    get().updateTotalDuration();
  },

  updateTotalDuration: () => {
    const state = get();
    if (!state.currentClass) return;

    const total = state.currentClass.phases.reduce((sum, p) => sum + p.duration, 0);
    const updatedClass: BreathworkClass = {
      ...state.currentClass,
      totalDuration: total,
      updatedAt: Date.now(),
    };

    set({ currentClass: updatedClass });
  },
}));

export const PHASE_NAMES_MAP = PHASE_NAMES;
