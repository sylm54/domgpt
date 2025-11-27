/**
 * Challenge type definitions and storage utilities
 */

import { pushEvent } from "@/agents/agents";
import { logActivity } from "@/pages/activity";

export interface Challenge {
  id: string;
  title: string;
  body: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export const CHALLENGE_STORAGE_KEY = "self-improvement-challenges";
export const MAX_CHALLENGES = 10;

/**
 * Load challenges from localStorage
 */
export function loadChallenges(): Challenge[] {
  try {
    const stored = localStorage.getItem(CHALLENGE_STORAGE_KEY);
    if (!stored) return [];
    const challenges = JSON.parse(stored) as Challenge[];
    return challenges.slice(0, MAX_CHALLENGES);
  } catch (error) {
    console.error("Failed to load challenges:", error);
    return [];
  }
}

const listeners = new Map();
let id = 0;
export function onChallengeChange(callback: (rules: Challenge[]) => void) {
  const cid = id++;
  listeners.set(cid, callback);
  return () => {
    listeners.delete(cid);
  };
}

/**
 * Save challenges to localStorage
 */
export function saveChallenges(challenges: Challenge[]): void {
  try {
    // Ensure we don't exceed max challenges
    const limitedChallenges = challenges.slice(0, MAX_CHALLENGES);
    localStorage.setItem(
      CHALLENGE_STORAGE_KEY,
      JSON.stringify(limitedChallenges),
    );
    listeners.forEach((callback) => {
      callback(challenges);
    });
  } catch (error) {
    console.error("Failed to save challenges:", error);
  }
}

/**
 * Create a new challenge
 */
export function createChallenge(title: string, body: string): Challenge {
  return {
    id: crypto.randomUUID(),
    title,
    body,
    completed: false,
    createdAt: Date.now(),
  };
}

/**
 * Add a challenge (respects max limit)
 */
export function addChallenge(
  challenges: Challenge[],
  title: string,
  body: string,
): Challenge[] {
  if (challenges.length >= MAX_CHALLENGES) {
    throw new Error(`Maximum of ${MAX_CHALLENGES} challenges reached`);
  }
  const newChallenge = createChallenge(title, body);
  logActivity("challenge_added", `Added challenge: ${title}`, body);
  return [...challenges, newChallenge];
}

/**
 * Toggle challenge completion status
 */
export function toggleChallengeCompletion(
  challenges: Challenge[],
  id: string,
): Challenge[] {
  return challenges
    .map((challenge) => {
      if (challenge.id === id) {
        if (!challenge.completed) {
          pushEvent({
            category: "challenge",
            message: `Challenge ${challenge.title} completed`,
          });
          logActivity(
            "challenge_completed",
            `Completed challenge: ${challenge.title}`,
            challenge.body,
            { challengeId: challenge.id },
          );
        }
        return {
          ...challenge,
          completed: !challenge.completed,
          completedAt: !challenge.completed ? Date.now() : undefined,
        };
      }
      return challenge;
    })
    .filter((challenge) => !challenge.completed);
}

/**
 * Remove a challenge by ID
 */
export function removeChallenge(
  challenges: Challenge[],
  id: string,
): Challenge[] {
  return challenges.filter((challenge) => challenge.id !== id);
}

/**
 * Get a challenge by ID
 */
export function getChallengeById(
  challenges: Challenge[],
  id: string,
): Challenge | undefined {
  return challenges.find((challenge) => challenge.id === id);
}
