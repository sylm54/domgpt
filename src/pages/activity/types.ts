/**
 * Activity type definitions and storage utilities
 * Tracks all user actions throughout the app
 */

export type ActivityType =
  | "challenge_completed"
  | "challenge_added"
  | "ritual_completed"
  | "ritual_missed"
  | "ritual_added"
  | "ritual_removed"
  | "reflection_saved"
  | "safe_locked"
  | "safe_unlocked"
  | "voice_assignment_completed"
  | "voice_assignment_added"
  | "rule_added"
  | "rule_removed"
  | "rule_updated"
  | "profile_updated"
  | "achievement_added"
  | "affirm_generated"
  | "inventory_item_added"
  | "inventory_item_removed"
  | "mood_increased"
  | "mood_decreased"
  | "session_started"
  | "custom";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export const ACTIVITY_STORAGE_KEY = "user-activity-log";
export const MAX_ACTIVITIES = 500;

/**
 * Load activities from localStorage
 */
export function loadActivities(): Activity[] {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!stored) return [];
    const activities = JSON.parse(stored) as Activity[];
    return activities;
  } catch (error) {
    console.error("Failed to load activities:", error);
    return [];
  }
}

const listeners = new Map<number, (activities: Activity[]) => void>();
let listenerId = 0;

export function onActivityChange(callback: (activities: Activity[]) => void) {
  const id = listenerId++;
  listeners.set(id, callback);
  return () => {
    listeners.delete(id);
  };
}

/**
 * Save activities to localStorage
 */
export function saveActivities(activities: Activity[]): void {
  try {
    // Keep only the most recent activities
    const limitedActivities = activities.slice(-MAX_ACTIVITIES);
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(limitedActivities));
    listeners.forEach((callback) => {
      callback(limitedActivities);
    });
  } catch (error) {
    console.error("Failed to save activities:", error);
  }
}

/**
 * Log a new activity
 */
export function logActivity(
  type: ActivityType,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>
): Activity {
  const activity: Activity = {
    id: crypto.randomUUID(),
    type,
    title,
    description,
    metadata,
    timestamp: Date.now(),
  };

  const activities = loadActivities();
  activities.push(activity);
  saveActivities(activities);

  return activity;
}

/**
 * Get activities filtered by type
 */
export function getActivitiesByType(type: ActivityType): Activity[] {
  const activities = loadActivities();
  return activities.filter((a) => a.type === type);
}

/**
 * Get activities within a time range
 */
export function getActivitiesInRange(startTime: number, endTime: number): Activity[] {
  const activities = loadActivities();
  return activities.filter((a) => a.timestamp >= startTime && a.timestamp <= endTime);
}

/**
 * Get activities from the last N days
 */
export function getRecentActivities(days: number): Activity[] {
  const now = Date.now();
  const startTime = now - days * 24 * 60 * 60 * 1000;
  return getActivitiesInRange(startTime, now);
}

/**
 * Clear all activities
 */
export function clearActivities(): void {
  saveActivities([]);
}

/**
 * Delete a specific activity by ID
 */
export function deleteActivity(id: string): void {
  const activities = loadActivities();
  const filtered = activities.filter((a) => a.id !== id);
  saveActivities(filtered);
}

/**
 * Format a timestamp as a relative date string (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else if (days === 1) {
    return "yesterday";
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks === 1) {
    return "1 week ago";
  } else if (weeks < 4) {
    return `${weeks} weeks ago`;
  } else if (months === 1) {
    return "1 month ago";
  } else if (months < 12) {
    return `${months} months ago`;
  } else {
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year ago" : `${years} years ago`;
  }
}

/**
 * Get a human-readable label for an activity type
 */
export function getActivityTypeLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    challenge_completed: "Challenge Completed",
    challenge_added: "Challenge Added",
    ritual_completed: "Ritual Completed",
    ritual_missed: "Ritual Missed",
    ritual_added: "Ritual Added",
    ritual_removed: "Ritual Removed",
    reflection_saved: "Reflection Saved",
    safe_locked: "Safe Locked",
    safe_unlocked: "Safe Unlocked",
    voice_assignment_completed: "Voice Assignment Completed",
    voice_assignment_added: "Voice Assignment Added",
    rule_added: "Rule Added",
    rule_removed: "Rule Removed",
    rule_updated: "Rule Updated",
    profile_updated: "Profile Updated",
    achievement_added: "Achievement Added",
    affirm_generated: "Affirmation Generated",
    inventory_item_added: "Inventory Item Added",
    inventory_item_removed: "Inventory Item Removed",
    mood_increased: "Mood Increased",
    mood_decreased: "Mood Decreased",
    session_started: "Session Started",
    custom: "Activity",
  };
  return labels[type] || "Activity";
}

/**
 * Get the icon name for an activity type (for use with lucide-react)
 */
export function getActivityTypeIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    challenge_completed: "Trophy",
    challenge_added: "Target",
    ritual_completed: "CheckCircle",
    ritual_missed: "XCircle",
    ritual_added: "Clock",
    ritual_removed: "Clock",
    reflection_saved: "BookOpen",
    safe_locked: "Lock",
    safe_unlocked: "Unlock",
    voice_assignment_completed: "Mic",
    voice_assignment_added: "Mic",
    rule_added: "Scroll",
    rule_removed: "Scroll",
    rule_updated: "Scroll",
    profile_updated: "User",
    achievement_added: "Award",
    affirm_generated: "Volume2",
    inventory_item_added: "Package",
    inventory_item_removed: "Package",
    mood_increased: "TrendingUp",
    mood_decreased: "TrendingDown",
    session_started: "Play",
    custom: "Activity",
  };
  return icons[type] || "Activity";
}

/**
 * Get activity data formatted for LLM/agent consumption
 * Returns a human-readable summary with relative timestamps
 */
export function getActivityForAgent(options?: {
  days?: number;
  limit?: number;
  types?: ActivityType[];
}): string {
  const { days = 7, limit = 50, types } = options || {};

  let activities = getRecentActivities(days);

  if (types && types.length > 0) {
    activities = activities.filter((a) => types.includes(a.type));
  }

  // Sort by most recent first
  activities.sort((a, b) => b.timestamp - a.timestamp);

  // Limit the results
  activities = activities.slice(0, limit);

  if (activities.length === 0) {
    return `No activity recorded in the last ${days} day${days === 1 ? "" : "s"}.`;
  }

  // Group activities by relative time periods
  const now = Date.now();
  const today: Activity[] = [];
  const yesterday: Activity[] = [];
  const thisWeek: Activity[] = [];
  const older: Activity[] = [];

  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneWeekMs = 7 * oneDayMs;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart.getTime() - oneDayMs);

  for (const activity of activities) {
    if (activity.timestamp >= todayStart.getTime()) {
      today.push(activity);
    } else if (activity.timestamp >= yesterdayStart.getTime()) {
      yesterday.push(activity);
    } else if (now - activity.timestamp < oneWeekMs) {
      thisWeek.push(activity);
    } else {
      older.push(activity);
    }
  }

  const formatActivityLine = (a: Activity): string => {
    const time = formatRelativeTime(a.timestamp);
    const desc = a.description ? ` - ${a.description}` : "";
    return `- [${time}] ${a.title}${desc}`;
  };

  let result = `## User Activity Summary (Last ${days} day${days === 1 ? "" : "s"})\n\n`;

  if (today.length > 0) {
    result += `### Today\n`;
    result += today.map(formatActivityLine).join("\n");
    result += "\n\n";
  }

  if (yesterday.length > 0) {
    result += `### Yesterday\n`;
    result += yesterday.map(formatActivityLine).join("\n");
    result += "\n\n";
  }

  if (thisWeek.length > 0) {
    result += `### Earlier This Week\n`;
    result += thisWeek.map(formatActivityLine).join("\n");
    result += "\n\n";
  }

  if (older.length > 0) {
    result += `### Earlier\n`;
    result += older.map(formatActivityLine).join("\n");
    result += "\n\n";
  }

  // Add summary statistics
  const stats = getActivityStats(activities);
  result += `### Summary\n`;
  result += `- Total activities: ${activities.length}\n`;
  result += `- Challenges completed: ${stats.challengesCompleted}\n`;
  result += `- Rituals completed: ${stats.ritualsCompleted}\n`;
  result += `- Rituals missed: ${stats.ritualsMissed}\n`;
  result += `- Reflections saved: ${stats.reflectionsSaved}\n`;
  result += `- Voice assignments completed: ${stats.voiceAssignmentsCompleted}\n`;

  return result.trim();
}

/**
 * Get activity statistics
 */
export function getActivityStats(activities?: Activity[]): {
  challengesCompleted: number;
  ritualsCompleted: number;
  ritualsMissed: number;
  reflectionsSaved: number;
  voiceAssignmentsCompleted: number;
  totalActivities: number;
} {
  const data = activities || loadActivities();

  return {
    challengesCompleted: data.filter((a) => a.type === "challenge_completed").length,
    ritualsCompleted: data.filter((a) => a.type === "ritual_completed").length,
    ritualsMissed: data.filter((a) => a.type === "ritual_missed").length,
    reflectionsSaved: data.filter((a) => a.type === "reflection_saved").length,
    voiceAssignmentsCompleted: data.filter((a) => a.type === "voice_assignment_completed").length,
    totalActivities: data.length,
  };
}

/**
 * Get a compact summary of recent activity for quick context
 */
export function getActivitySummaryForAgent(): string {
  const stats = getActivityStats(getRecentActivities(7));
  const recentActivities = getRecentActivities(1);

  let summary = "Recent activity: ";

  if (recentActivities.length === 0) {
    summary += "No activity in the last 24 hours. ";
  } else {
    summary += `${recentActivities.length} action${recentActivities.length === 1 ? "" : "s"} in the last 24 hours. `;
  }

  const highlights: string[] = [];
  if (stats.challengesCompleted > 0) {
    highlights.push(`${stats.challengesCompleted} challenge${stats.challengesCompleted === 1 ? "" : "s"} completed this week`);
  }
  if (stats.ritualsCompleted > 0) {
    highlights.push(`${stats.ritualsCompleted} ritual${stats.ritualsCompleted === 1 ? "" : "s"} completed this week`);
  }
  if (stats.ritualsMissed > 0) {
    highlights.push(`${stats.ritualsMissed} ritual${stats.ritualsMissed === 1 ? "" : "s"} missed this week`);
  }
  if (stats.reflectionsSaved > 0) {
    highlights.push(`${stats.reflectionsSaved} reflection${stats.reflectionsSaved === 1 ? "" : "s"} saved this week`);
  }

  if (highlights.length > 0) {
    summary += highlights.join(", ") + ".";
  }

  return summary;
}
