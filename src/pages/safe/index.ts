/**
 * Safe Module
 *
 * This module provides secure key storage functionality for the self-improvement app.
 * It includes UI components, agent integration, and storage utilities.
 */

// Types and utilities
export type { SafeData } from "./types";
export {
  loadSafeData,
  saveSafeData,
  lockSafe,
  unlockSafe,
  isSafeLocked,
  getKey,
  getLockedDuration,
  formatLockedDuration,
  SAFE_STORAGE_KEY,
} from "./types";

// View component
export { default as SafeView } from "./view";
