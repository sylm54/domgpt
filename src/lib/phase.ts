import { useState, useEffect } from "react";
import type { Phase } from "@/config";

export const PHASE_STORAGE_KEY = "user-phase-state";
export const PHASES_STORAGE_KEY = "user-phases";
export const PHASE_EVENT_NAME = "phase-changed";
export const PHASES_EVENT_NAME = "phases-changed";

export interface PhaseState {
  currentPhaseIndex: number;
  challengeReady: boolean;
  completedPhases: number[];
}

export const DEFAULT_PHASE_STATE: PhaseState = {
  currentPhaseIndex: 0,
  challengeReady: false,
  completedPhases: [],
};

/**
 * Load phase state from localStorage
 */
export function loadPhaseState(): PhaseState {
  try {
    const stored = localStorage.getItem(PHASE_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PHASE_STATE;
    }
    const data = JSON.parse(stored) as PhaseState;
    // Ensure data integrity
    if (
      typeof data.currentPhaseIndex !== "number" ||
      typeof data.challengeReady !== "boolean" ||
      !Array.isArray(data.completedPhases)
    ) {
      return DEFAULT_PHASE_STATE;
    }
    return data;
  } catch (error) {
    console.error("Failed to load phase state:", error);
    return DEFAULT_PHASE_STATE;
  }
}

/**
 * Save phase state to localStorage and dispatch event
 */
export function savePhaseState(state: PhaseState): void {
  try {
    localStorage.setItem(PHASE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(PHASE_EVENT_NAME, { detail: state }));
  } catch (error) {
    console.error("Failed to save phase state:", error);
  }
}

/**
 * Get current phase index
 */
export function getCurrentPhaseIndex(): number {
  return loadPhaseState().currentPhaseIndex;
}

/**
 * Mark the current challenge as ready
 */
export function markChallengeReady(): void {
  const state = loadPhaseState();
  const newState = {
    ...state,
    challengeReady: true,
  };
  savePhaseState(newState);
}

/**
 * Complete the current challenge and advance to next phase
 */
export function completeChallenge(): void {
  const state = loadPhaseState();
  const newState = {
    currentPhaseIndex: state.currentPhaseIndex + 1,
    challengeReady: false,
    completedPhases: [...state.completedPhases, state.currentPhaseIndex],
  };
  savePhaseState(newState);
}

/**
 * Reset phase state to default
 */
export function resetPhaseState(): void {
  savePhaseState(DEFAULT_PHASE_STATE);
}

/**
 * React hook to subscribe to phase state changes
 */
export function usePhaseState() {
  const [state, setState] = useState<PhaseState>(loadPhaseState());

  useEffect(() => {
    const handlePhaseChange = (event: Event) => {
      const customEvent = event as CustomEvent<PhaseState>;
      setState(customEvent.detail);
    };

    window.addEventListener(PHASE_EVENT_NAME, handlePhaseChange);

    // Also update on storage event (for cross-tab sync if needed)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PHASE_STORAGE_KEY) {
        setState(loadPhaseState());
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(PHASE_EVENT_NAME, handlePhaseChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return state;
}

// ============================================
// Phases Array Storage (localStorage-backed)
// ============================================

/**
 * Load phases array from localStorage
 */
export function loadPhases(): Phase[] {
  try {
    const stored = localStorage.getItem(PHASES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const data = JSON.parse(stored);
    if (!Array.isArray(data)) {
      return [];
    }
    return data as Phase[];
  } catch (error) {
    console.error("Failed to load phases:", error);
    return [];
  }
}

/**
 * Save phases array to localStorage and dispatch event
 */
export function savePhases(phases: Phase[]): void {
  try {
    localStorage.setItem(PHASES_STORAGE_KEY, JSON.stringify(phases));
    window.dispatchEvent(
      new CustomEvent(PHASES_EVENT_NAME, { detail: phases }),
    );
  } catch (error) {
    console.error("Failed to save phases:", error);
  }
}

/**
 * Add a new phase to the phases array
 */
export function addPhase(phase: Phase): void {
  const phases = loadPhases();
  phases.push(phase);
  savePhases(phases);
}

/**
 * Update an existing phase by index
 */
export function updatePhase(index: number, phase: Phase): void {
  const phases = loadPhases();
  if (index >= 0 && index < phases.length) {
    phases[index] = phase;
    savePhases(phases);
  }
}

/**
 * Remove a phase by index
 */
export function removePhase(index: number): void {
  const phases = loadPhases();
  if (index >= 0 && index < phases.length) {
    phases.splice(index, 1);
    savePhases(phases);
  }
}

/**
 * Clear all phases
 */
export function clearPhases(): void {
  savePhases([]);
}

/**
 * Set all phases at once (replaces existing)
 */
export function setPhases(phases: Phase[]): void {
  savePhases(phases);
}

/**
 * React hook to subscribe to phases changes
 */
export function usePhases() {
  const [phases, setPhasesState] = useState<Phase[]>(loadPhases());

  useEffect(() => {
    const handlePhasesChange = (event: Event) => {
      const customEvent = event as CustomEvent<Phase[]>;
      setPhasesState(customEvent.detail);
    };

    window.addEventListener(PHASES_EVENT_NAME, handlePhasesChange);

    // Also update on storage event (for cross-tab sync if needed)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PHASES_STORAGE_KEY) {
        setPhasesState(loadPhases());
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(PHASES_EVENT_NAME, handlePhasesChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return phases;
}
