/**
 * Reflection type definitions and storage utilities
 *
 * Updated to store a snapshot of the prompts together with each day's responses.
 * This allows old reflections to retain the original prompts even after prompts change.
 *
 * Also performs migration from the older shape where reflections were stored as
 * date -> string[] to the new shape date -> { prompts: string[]; responses: string[]; savedAt?: string }.
 */

import { pushEvent } from "@/agents/agents";
import { logActivity } from "@/pages/activity";

export interface ReflectionRecord {
  prompts: string[]; // Snapshot of prompts at time of saving
  responses: string[]; // Responses for that day
  savedAt?: string; // ISO timestamp when this record was saved
}

export interface ReflectionData {
  prompts: string[];
  reflections: {
    [date: string]: ReflectionRecord; // YYYY-MM-DD -> ReflectionRecord
  };
}

export const REFLECTION_STORAGE_KEY = "self-improvement-reflections";
export const DEFAULT_PROMPTS = [
  "What am I grateful for today?",
  "What did I learn today?",
  "What will I improve tomorrow?",
];

/**
 * Get today's date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

/**
 * Get date string for relative day (0 = today, 1 = yesterday, etc.)
 */
export function getRelativeDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

/**
 * Parse date string to readable format
 */
export function formatDateString(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = getTodayDateString();
  const yesterday = getRelativeDateString(1);

  if (dateString === today) return "Today";
  if (dateString === yesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Load reflection data from localStorage
 *
 * Performs migration of legacy reflections that were stored as date -> string[] by wrapping
 * them into ReflectionRecord and preserving the prompts that were stored at the root of the file
 * (if present), otherwise using DEFAULT_PROMPTS.
 */
export function loadReflectionData(): ReflectionData {
  try {
    const stored = localStorage.getItem(REFLECTION_STORAGE_KEY);
    if (!stored) {
      return {
        prompts: [...DEFAULT_PROMPTS],
        reflections: {},
      };
    }

    // Attempt parse
    const parsed = JSON.parse(stored) as any;

    // Basic validation and defaults
    const prompts: string[] =
      Array.isArray(parsed?.prompts) && parsed.prompts.length === 3
        ? parsed.prompts
        : [...DEFAULT_PROMPTS];

    const rawReflections = parsed?.reflections || {};
    const reflections: { [date: string]: ReflectionRecord } = {};

    // Migrate each entry
    Object.keys(rawReflections).forEach((date) => {
      const value = rawReflections[date];

      if (Array.isArray(value)) {
        // Legacy shape: date -> string[] (responses)
        reflections[date] = {
          prompts: prompts.slice(), // snapshot the (root) prompts at load time
          responses: value.slice(),
          savedAt: undefined,
        };
      } else if (
        value &&
        Array.isArray(value.responses) &&
        Array.isArray(value.prompts)
      ) {
        // New shape already
        reflections[date] = {
          prompts: value.prompts.slice(),
          responses: value.responses.slice(),
          savedAt:
            typeof value.savedAt === "string" ? value.savedAt : undefined,
        };
      } else {
        // Unrecognized shape - ignore
      }
    });

    return {
      prompts,
      reflections,
    };
  } catch (error) {
    console.error("Failed to load reflection data:", error);
    return {
      prompts: [...DEFAULT_PROMPTS],
      reflections: {},
    };
  }
}

const listeners = new Map<number, (data: ReflectionData) => void>();
let id = 0;
export function onReflectionDataChange(
  callback: (data: ReflectionData) => void,
) {
  const cid = id++;
  listeners.set(cid, callback);
  return () => {
    listeners.delete(cid);
  };
}

/**
 * Save reflection data to localStorage
 */
export function saveReflectionData(data: ReflectionData): void {
  try {
    localStorage.setItem(REFLECTION_STORAGE_KEY, JSON.stringify(data));
    listeners.forEach((callback) => {
      callback(data);
    });
  } catch (error) {
    console.error("Failed to save reflection data:", error);
  }
}

/**
 * Get the responses array for a specific date (backwards-compatible).
 * Returns null if not found.
 */
export function getReflectionForDate(
  data: ReflectionData,
  dateString: string,
): string[] | null {
  const record = data.reflections[dateString];
  if (!record) return null;
  return record.responses || null;
}

/**
 * Get the full reflection record (prompts + responses) for a date.
 * Returns null if not found.
 */
export function getReflectionRecordForDate(
  data: ReflectionData,
  dateString: string,
): ReflectionRecord | null {
  return data.reflections[dateString] || null;
}

/**
 * Save reflection for a specific date.
 *
 * This will snapshot the current prompts into the saved record so older entries keep their original prompts.
 */
export function saveReflectionForDate(
  data: ReflectionData,
  dateString: string,
  responses: string[],
): ReflectionData {
  pushEvent({
    category: "reflection",
    message: "Saved reflection for " + dateString,
  });
  logActivity(
    "reflection_saved",
    `Saved reflection for ${formatDateString(dateString)}`,
    responses.filter((r) => r.trim()).length > 0
      ? `Answered ${responses.filter((r) => r.trim()).length} prompt(s)`
      : undefined,
    { date: dateString },
  );
  // Keep the requirement of exactly 3 responses for now to match UI expectations.
  if (!Array.isArray(responses) || responses.length !== 3) {
    throw new Error("Reflections must have exactly 3 responses");
  }

  const record: ReflectionRecord = {
    prompts: data.prompts.slice(),
    responses: responses.slice(),
    savedAt: new Date().toISOString(),
  };

  return {
    ...data,
    reflections: {
      ...data.reflections,
      [dateString]: record,
    },
  };
}

/**
 * Update a specific prompt at the root (does not change existing saved records).
 */
export function updatePrompt(
  data: ReflectionData,
  index: number,
  newText: string,
): ReflectionData {
  if (index < 0 || index > 2) {
    throw new Error("Prompt index must be 0, 1, or 2");
  }
  const newPrompts = [...data.prompts];
  newPrompts[index] = newText;
  return {
    ...data,
    prompts: newPrompts,
  };
}

/**
 * Get recent reflections for the last N days (0 = today).
 * Returns objects with { date, responses } for compatibility with existing consumers.
 */
export function getRecentReflections(
  data: ReflectionData,
  days: number,
): Array<{
  date: string;
  responses: string[];
}> {
  const result: Array<{ date: string; responses: string[] }> = [];

  for (let i = 0; i < days; i++) {
    const dateString = getRelativeDateString(i);
    const record = data.reflections[dateString];
    if (record) {
      result.push({ date: dateString, responses: record.responses });
    }
  }

  return result;
}

/**
 * Get all dates that have reflections
 */
export function getAllReflectionDates(data: ReflectionData): string[] {
  return Object.keys(data.reflections).sort((a, b) => b.localeCompare(a));
}

/**
 * Get reflection count
 */
export function getReflectionCount(data: ReflectionData): number {
  return Object.keys(data.reflections).length;
}

/**
 * Check if reflection exists for a date
 */
export function hasReflectionForDate(
  data: ReflectionData,
  dateString: string,
): boolean {
  return !!data.reflections[dateString];
}

/**
 * Get reflection streak (consecutive days with reflections)
 */
export function getReflectionStreak(data: ReflectionData): number {
  let streak = 0;
  const currentDate = new Date();

  while (true) {
    const dateString = currentDate.toISOString().split("T")[0];
    if (!data.reflections[dateString]) {
      break;
    }
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
}
