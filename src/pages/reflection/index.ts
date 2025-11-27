/**
 * Reflection Module
 *
 * This module provides daily reflection functionality for the self-improvement app.
 * It includes UI components, agent integration, and storage utilities.
 */

// Types and utilities
export type { ReflectionData } from "./types";
export {
  loadReflectionData,
  saveReflectionData,
  getTodayDateString,
  getRelativeDateString,
  formatDateString,
  saveReflectionForDate,
  getReflectionForDate,
  updatePrompt,
  getRecentReflections,
  getAllReflectionDates,
  getReflectionCount,
  hasReflectionForDate,
  getReflectionStreak,
  DEFAULT_PROMPTS,
  REFLECTION_STORAGE_KEY,
} from "./types";

// View component
export { default as ReflectionView } from "./view";
