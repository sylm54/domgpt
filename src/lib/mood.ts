import { useState, useEffect } from "react";

export const MOOD_STORAGE_KEY = "user-mood";
export const MOOD_EVENT_NAME = "mood-changed";

export interface MoodData {
  value: number; // 1-10
}

export const DEFAULT_MOOD = 5;

/**
 * Load mood data from localStorage
 */
export function loadMood(): MoodData {
  try {
    const stored = localStorage.getItem(MOOD_STORAGE_KEY);
    if (!stored) {
      return { value: DEFAULT_MOOD };
    }
    const data = JSON.parse(stored) as MoodData;
    // Ensure value is within bounds
    if (typeof data.value !== "number" || data.value < 1 || data.value > 10) {
      return { value: DEFAULT_MOOD };
    }
    return data;
  } catch (error) {
    console.error("Failed to load mood data:", error);
    return { value: DEFAULT_MOOD };
  }
}

/**
 * Save mood data to localStorage and dispatch event
 */
export function saveMood(data: MoodData): void {
  try {
    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(MOOD_EVENT_NAME, { detail: data }));
  } catch (error) {
    console.error("Failed to save mood data:", error);
  }
}

/**
 * Set mood value directly
 */
export function setMood(value: number): number {
  const clampedValue = Math.max(1, Math.min(10, Math.round(value)));
  saveMood({ value: clampedValue });
  return clampedValue;
}

/**
 * Get current mood value
 */
export function getMood(): number {
  return loadMood().value;
}

/**
 * Increase mood by 1
 */
export function increaseMood(): number {
  const current = getMood();
  return setMood(current + 1);
}

/**
 * Decrease mood by 1
 */
export function decreaseMood(): number {
  const current = getMood();
  return setMood(current - 1);
}

/**
 * React hook to subscribe to mood changes
 */
export function useMood() {
  const [mood, setMoodState] = useState<number>(getMood());

  useEffect(() => {
    const handleMoodChange = (event: Event) => {
      const customEvent = event as CustomEvent<MoodData>;
      setMoodState(customEvent.detail.value);
    };

    window.addEventListener(MOOD_EVENT_NAME, handleMoodChange);
    
    // Also update on storage event (for cross-tab sync if needed, though CustomEvent is local)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MOOD_STORAGE_KEY) {
        setMoodState(getMood());
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(MOOD_EVENT_NAME, handleMoodChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return mood;
}
