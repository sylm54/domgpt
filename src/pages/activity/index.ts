/**
 * Activity Module
 *
 * This module provides activity logging and tracking functionality for the app.
 * It logs user actions like completing challenges, rituals, reflections, etc.
 */

// Types and utilities
export type { Activity, ActivityType } from "./types";
export {
  loadActivities,
  saveActivities,
  logActivity,
  onActivityChange,
  getActivitiesByType,
  getActivitiesInRange,
  getRecentActivities,
  clearActivities,
  deleteActivity,
  formatRelativeTime,
  getActivityTypeLabel,
  getActivityTypeIcon,
  getActivityForAgent,
  getActivityStats,
  getActivitySummaryForAgent,
  ACTIVITY_STORAGE_KEY,
  MAX_ACTIVITIES,
} from "./types";

// View component
export { default as ActivityView } from "./view";

// Agent tools
export { activity_tools } from "./agent";
