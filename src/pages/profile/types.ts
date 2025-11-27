/**
 * Profile type definitions and storage utilities
 */

import { logActivity } from "@/pages/activity";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

export interface ProfileData {
  title: string;
  description: string;
  achievements: Achievement[];
  fields: Record<string, string>;
}

export const PROFILE_STORAGE_KEY = "self-improvement-profile";
export const DEFAULT_TITLE = "Unknown";
export const DEFAULT_DESCRIPTION = "There is no data for this profile yet.";

/**
 * Load profile data from localStorage
 */
export function loadProfileData(): ProfileData {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) {
      return {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        achievements: [],
        fields: {},
      };
    }
    const data = JSON.parse(stored) as ProfileData;
    if (!data.fields) {
      data.fields = {};
    }
    return data;
  } catch (error) {
    console.error("Failed to load profile data:", error);
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      achievements: [],
      fields: {},
    };
  }
}

/**
 * Save profile data to localStorage
 */
export function saveProfileData(data: ProfileData): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save profile data:", error);
  }
}

/**
 * Update profile title
 */
export function updateTitle(data: ProfileData, newTitle: string): ProfileData {
  logActivity(
    "profile_updated",
    `Updated profile title`,
    `New title: ${newTitle}`,
  );
  return {
    ...data,
    title: newTitle,
  };
}

/**
 * Update profile description
 */
export function updateDescription(
  data: ProfileData,
  newDescription: string,
): ProfileData {
  logActivity("profile_updated", `Updated profile description`);
  return {
    ...data,
    description: newDescription,
  };
}

/**
 * Create a new achievement
 */
export function createAchievement(
  title: string,
  description: string,
): Achievement {
  return {
    id: crypto.randomUUID(),
    title,
    description,
    createdAt: Date.now(),
  };
}

/**
 * Add an achievement
 */
export function addAchievement(
  data: ProfileData,
  title: string,
  description: string,
): ProfileData {
  const newAchievement = createAchievement(title, description);
  logActivity(
    "achievement_added",
    `Earned achievement: ${title}`,
    description,
    { achievementId: newAchievement.id },
  );
  return {
    ...data,
    achievements: [...data.achievements, newAchievement],
  };
}

/**
 * Remove an achievement by ID
 */
export function removeAchievement(data: ProfileData, id: string): ProfileData {
  return {
    ...data,
    achievements: data.achievements.filter((a) => a.id !== id),
  };
}

/**
 * Get achievement by ID
 */
export function getAchievementById(
  data: ProfileData,
  id: string,
): Achievement | undefined {
  return data.achievements.find((a) => a.id === id);
}

/**
 * Get achievement count
 */
export function getAchievementCount(data: ProfileData): number {
  return data.achievements.length;
}

/**
 * Get achievements sorted by date (newest first)
 */
export function getAchievementsSortedByDate(data: ProfileData): Achievement[] {
  return [...data.achievements].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Update a specific field
 */
export function updateField(
  data: ProfileData,
  fieldName: string,
  value: string,
): ProfileData {
  return {
    ...data,
    fields: {
      ...data.fields,
      [fieldName]: value,
    },
  };
}
