/**
 * Safe type definitions and storage utilities
 */

import { pushEvent } from "@/agents/agents";
import { logActivity } from "@/pages/activity";

export interface SafeData {
  key: string | null;
  lockedAt: number | null;
  isLocked: boolean;
}

export const SAFE_STORAGE_KEY = "self-improvement-safe";

/**
 * Load safe data from localStorage
 */
export function loadSafeData(): SafeData {
  try {
    const stored = localStorage.getItem(SAFE_STORAGE_KEY);
    if (!stored) {
      return {
        key: null,
        lockedAt: null,
        isLocked: false,
      };
    }
    const data = JSON.parse(stored) as SafeData;
    return data;
  } catch (error) {
    console.error("Failed to load safe data:", error);
    return {
      key: null,
      lockedAt: null,
      isLocked: false,
    };
  }
}

/**
 * Save safe data to localStorage
 */
export function saveSafeData(data: SafeData): void {
  try {
    localStorage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save safe data:", error);
  }
}

/**
 * Lock the safe with a key
 */
export function lockSafe(key: string): SafeData {
  if (!key || key.trim().length === 0) {
    throw new Error("Key cannot be empty");
  }
  pushEvent({
    category: "safe",
    message: `Key is locked`,
  });
  logActivity("safe_locked", "Safe locked", "Key has been secured in the safe");
  return {
    key: key.trim(),
    lockedAt: Date.now(),
    isLocked: true,
  };
}

/**
 * Unlock the safe
 */
export function unlockSafe(data: SafeData): SafeData {
  if (!data.isLocked) {
    throw new Error("Safe is not locked");
  }
  const duration = data.lockedAt ? Date.now() - data.lockedAt : 0;
  logActivity(
    "safe_unlocked",
    "Safe unlocked",
    `Key retrieved after ${formatLockedDuration(duration)}`,
    { lockedDuration: duration },
  );
  return {
    key: null,
    lockedAt: null,
    isLocked: false,
  };
}

/**
 * Check if safe is locked
 */
export function isSafeLocked(data: SafeData): boolean {
  return data.isLocked;
}

/**
 * Get the key from the safe (only if unlocked)
 */
export function getKey(data: SafeData): string | null {
  return data.key;
}

/**
 * Get locked duration in milliseconds
 */
export function getLockedDuration(data: SafeData): number | null {
  if (!data.isLocked || !data.lockedAt) {
    return null;
  }
  return Date.now() - data.lockedAt;
}

/**
 * Format locked duration as human-readable string
 */
export function formatLockedDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}, ${hours % 24} hour${hours % 24 !== 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes % 60} minute${minutes % 60 !== 1 ? "s" : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}, ${seconds % 60} second${seconds % 60 !== 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
