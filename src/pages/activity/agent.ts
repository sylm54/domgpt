/**
 * Activity Agent Tools
 *
 * Provides tools for agents to query user activity data
 */

import { z } from "zod";
import { tool } from "@/lib/models";
import {
  getActivityForAgent,
  getActivitySummaryForAgent,
  getRecentActivities,
  getActivitiesByType,
  getActivityStats,
  formatRelativeTime,
  type ActivityType,
} from "./types";

/**
 * Tool to get detailed activity log for the agent
 */
const getActivityLogTool = tool({
  name: "get_activity_log",
  description:
    "Get the user's recent activity log. Shows what the user has been doing in the app including challenges completed, rituals done, reflections saved, etc. Use this to understand the user's engagement and progress.",
  schema: {
    days: z
      .number()
      .min(1)
      .max(30)
      .optional()
      .describe("Number of days to look back (default: 7, max: 30)"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of activities to return (default: 50)"),
  },
  call: async ({ days, limit }) => {
    return getActivityForAgent({ days: days ?? 7, limit: limit ?? 50 });
  },
});

/**
 * Tool to get a quick activity summary
 */
const getActivitySummaryTool = tool({
  name: "get_activity_summary",
  description:
    "Get a brief summary of the user's recent activity. Use this for quick context about what the user has been doing.",
  schema: {},
  call: async () => {
    return getActivitySummaryForAgent();
  },
});

/**
 * Tool to get activity statistics
 */
const getActivityStatsTool = tool({
  name: "get_activity_stats",
  description:
    "Get statistics about the user's activity including counts of challenges completed, rituals done/missed, reflections saved, etc.",
  schema: {
    days: z
      .number()
      .min(1)
      .max(365)
      .optional()
      .describe("Number of days to calculate stats for (default: all time)"),
  },
  call: async ({ days }) => {
    const activities = days ? getRecentActivities(days) : undefined;
    const stats = getActivityStats(activities);

    return `Activity Statistics${days ? ` (Last ${days} days)` : " (All Time)"}:
- Total activities logged: ${stats.totalActivities}
- Challenges completed: ${stats.challengesCompleted}
- Rituals completed: ${stats.ritualsCompleted}
- Rituals missed: ${stats.ritualsMissed}
- Reflections saved: ${stats.reflectionsSaved}
- Voice assignments completed: ${stats.voiceAssignmentsCompleted}`;
  },
});

/**
 * Tool to check specific activity types
 */
const getActivitiesByTypeTool = tool({
  name: "get_activities_by_type",
  description:
    "Get activities filtered by a specific type. Useful for checking specific kinds of user actions.",
  schema: {
    type: z
      .enum([
        "challenge_completed",
        "challenge_added",
        "ritual_completed",
        "ritual_missed",
        "ritual_added",
        "ritual_removed",
        "reflection_saved",
        "safe_locked",
        "safe_unlocked",
        "voice_assignment_completed",
        "voice_assignment_added",
        "rule_added",
        "rule_removed",
        "rule_updated",
        "profile_updated",
        "achievement_added",
        "affirm_generated",
        "inventory_item_added",
        "inventory_item_removed",
        "mood_increased",
        "mood_decreased",
        "session_started",
        "custom",
      ])
      .describe("The type of activity to filter by"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of activities to return (default: 20)"),
  },
  call: async ({ type, limit }) => {
    const activities = getActivitiesByType(type as ActivityType)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit ?? 20);

    if (activities.length === 0) {
      return `No activities of type "${type}" found.`;
    }

    const lines = activities.map((a) => {
      const time = formatRelativeTime(a.timestamp);
      const desc = a.description ? ` - ${a.description}` : "";
      return `- [${time}] ${a.title}${desc}`;
    });

    return `Activities of type "${type}" (${activities.length} found):\n${lines.join("\n")}`;
  },
});

/**
 * All activity-related tools for the agent
 */
export const activity_tools = [
  getActivityLogTool,
  getActivitySummaryTool,
  getActivityStatsTool,
  getActivitiesByTypeTool,
];
