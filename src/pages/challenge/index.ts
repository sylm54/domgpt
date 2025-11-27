/**
 * Challenge Module
 *
 * This module provides challenge management functionality for the self-improvement app.
 * It includes UI components, agent integration, and storage utilities.
 */

// Types and utilities
export type { Challenge } from "./types";
export {
  loadChallenges,
  saveChallenges,
  addChallenge,
  removeChallenge,
  toggleChallengeCompletion,
  getChallengeById,
  createChallenge,
  MAX_CHALLENGES,
  CHALLENGE_STORAGE_KEY,
} from "./types";

// View component
export { default as ChallengeView } from "./view";
