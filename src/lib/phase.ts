import { useState, useEffect } from "react";

export const PHASE_STORAGE_KEY = "user-phase-state";
export const PHASE_EVENT_NAME = "phase-changed";

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
