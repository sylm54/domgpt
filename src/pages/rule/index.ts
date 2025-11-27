/**
 * Rule Module
 *
 * This module provides rule management functionality for the self-improvement app.
 * It includes UI components, agent integration, and storage utilities.
 */

// Types and utilities
export type { Rule, RuleBreak } from "./types";
export {
  loadRules,
  saveRules,
  addRule,
  removeRule,
  getRuleById,
  logRuleBreak,
  markBreaksAsSeen,
  getUnseenBreaks,
  getBreakCount,
  getBreakCountInRange,
  createRule,
  MAX_RULES,
  RULE_STORAGE_KEY,
} from "./types";

// View component
export { default as RuleView } from "./view";
