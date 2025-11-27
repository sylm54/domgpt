/**
 * Profile Module
 *
 * This module provides profile management functionality for the self-improvement app.
 * It includes UI components, agent integration, and storage utilities.
 */

// Types and utilities
export type { ProfileData, Achievement } from "./types";
export {
  loadProfileData,
  saveProfileData,
  updateTitle,
  updateDescription,
  createAchievement,
  addAchievement,
  removeAchievement,
  getAchievementById,
  getAchievementCount,
  getAchievementsSortedByDate,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  PROFILE_STORAGE_KEY,
} from "./types";

// View component
export { default as ProfileView } from "./view";
