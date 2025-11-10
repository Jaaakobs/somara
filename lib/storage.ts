import { BreathworkClass } from "@/types";

const STORAGE_KEY = "breathwork-classes";

export function saveClass(clazz: BreathworkClass): void {
  const classes = getAllClasses();
  const existingIndex = classes.findIndex((c) => c.id === clazz.id);
  
  if (existingIndex >= 0) {
    classes[existingIndex] = { ...clazz, updatedAt: Date.now() };
  } else {
    classes.push({ ...clazz, updatedAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}

export function getAllClasses(): BreathworkClass[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getClassById(id: string): BreathworkClass | null {
  const classes = getAllClasses();
  return classes.find((c) => c.id === id) || null;
}

export function deleteClass(id: string): void {
  const classes = getAllClasses();
  const filtered = classes.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function duplicateClass(id: string): BreathworkClass | null {
  const clazz = getClassById(id);
  if (!clazz) return null;
  
  const duplicated: BreathworkClass = {
    ...clazz,
    id: crypto.randomUUID(),
    theme: clazz.theme ? `${clazz.theme} (Copy)` : undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  saveClass(duplicated);
  return duplicated;
}

export function exportClassToJSON(clazz: BreathworkClass): string {
  return JSON.stringify(clazz, null, 2);
}

export function importClassFromJSON(json: string): BreathworkClass | null {
  try {
    const clazz = JSON.parse(json) as BreathworkClass;
    clazz.id = crypto.randomUUID();
    clazz.createdAt = Date.now();
    clazz.updatedAt = Date.now();
    saveClass(clazz);
    return clazz;
  } catch {
    return null;
  }
}

