/**
 * Learning Hub progress storage engine.
 * Provides SSR-safe, persistent storage for path step completion using localStorage
 * with graceful in-memory fallback and reactive custom event dispatching.
 */

export const PROGRESS_STORAGE_KEY = "epoch_learning_progress";

export interface PathProgress {
  completed: number;
  total: number;
  percentage: number;
}

let memoryStore: Record<string, boolean> = {};
let memoryFallbackActive = false;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStorage(): Record<string, boolean> {
  if (memoryFallbackActive) {
    return { ...memoryStore };
  }
  const storage = getLocalStorage();
  if (!storage) {
    return { ...memoryStore };
  }
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
      return {};
    } catch {
      // Corrupted JSON in storage - return empty object so writes can repair it
      return {};
    }
  } catch {
    // Accessing localStorage failed (e.g. SecurityError in iframe sandbox)
    memoryFallbackActive = true;
    return { ...memoryStore };
  }
}

function writeStorage(data: Record<string, boolean>): void {
  memoryStore = { ...data };
  if (memoryFallbackActive) {
    return;
  }
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceeded or write restriction - activate memory fallback
    memoryFallbackActive = true;
  }
}

/**
 * Returns a Set of all step keys currently marked as completed.
 */
export function getCompletedSteps(): Set<string> {
  const data = readStorage();
  const completedSet = new Set<string>();
  for (const [key, value] of Object.entries(data)) {
    if (value === true) {
      completedSet.add(key);
    }
  }
  return completedSet;
}

/**
 * Checks whether a specific step key is marked completed.
 */
export function isStepCompleted(stepKey: string): boolean {
  const data = readStorage();
  return data[stepKey] === true;
}

/**
 * Inverts the completion status of a step key, persists to storage,
 * dispatches an 'epoch:progress-change' CustomEvent on window (if present),
 * and returns the new status.
 */
export function toggleStepCompletion(stepKey: string): boolean {
  const data = readStorage();
  const newStatus = !data[stepKey];
  data[stepKey] = newStatus;
  writeStorage(data);

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent("epoch:progress-change", {
          detail: { stepKey, completed: newStatus },
        })
      );
    } catch {
      // Ignore if event dispatch fails in restricted environments
    }
  }

  return newStatus;
}

/**
 * Calculates progress for a path given an array of step IDs or full step keys.
 * Handles empty steps gracefully (percentage = 0).
 * Clamps percentage between 0 and 100 rounded to integer.
 */
export function getPathProgress(pathId: string, stepIds: string[]): PathProgress {
  if (!stepIds || stepIds.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completedSteps = getCompletedSteps();
  let completed = 0;

  for (const step of stepIds) {
    const fullKey = step.startsWith(`${pathId}:`) ? step : `${pathId}:${step}`;
    if (completedSteps.has(fullKey)) {
      completed++;
    }
  }

  const total = stepIds.length;
  const rawPercentage = (completed / total) * 100;
  const percentage = Math.min(100, Math.max(0, Math.round(rawPercentage)));

  return {
    completed,
    total,
    percentage,
  };
}

/**
 * Clears all learning progress from both localStorage and in-memory fallback.
 * Dispatches an 'epoch:progress-change' CustomEvent on window.
 */
export function clearProgress(): void {
  memoryStore = {};
  memoryFallbackActive = false;
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      // Ignore errors when clearing localStorage
    }
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent("epoch:progress-change", { detail: { cleared: true } })
      );
    } catch {
      // Ignore
    }
  }
}
