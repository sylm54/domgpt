/**
 * Rule type definitions and storage utilities
 */

import { pushEvent } from "@/agents/agents";
import { logActivity } from "@/pages/activity";

export interface RuleBreak {
  timestamp: number;
  seenByAgent?: boolean;
}

export interface Rule {
  id: string;
  title: string;
  body: string;
  breaks: RuleBreak[];
  createdAt: number;
}

export const RULE_STORAGE_KEY = "self-improvement-rules";
export const MAX_RULES = 10;

/**
 * Load rules from localStorage
 */
export function loadRules(): Rule[] {
  try {
    const stored = localStorage.getItem(RULE_STORAGE_KEY);
    if (!stored) return [];
    const rules = JSON.parse(stored) as Rule[];
    return rules.slice(0, MAX_RULES);
  } catch (error) {
    console.error("Failed to load rules:", error);
    return [];
  }
}

const listeners = new Map();
let id = 0;
export function onRuleChange(callback: (rules: Rule[]) => void) {
  const cid = id++;
  listeners.set(cid, callback);
  return () => {
    listeners.delete(cid);
  };
}

/**
 * Save rules to localStorage
 */
export function saveRules(rules: Rule[]): void {
  try {
    const limitedRules = rules.slice(0, MAX_RULES);
    localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(limitedRules));
    listeners.forEach((callback) => {
      callback(rules);
    });
  } catch (error) {
    console.error("Failed to save rules:", error);
  }
}

/**
 * Create a new rule
 */
export function createRule(title: string, body: string): Rule {
  return {
    id: crypto.randomUUID(),
    title,
    body,
    breaks: [],
    createdAt: Date.now(),
  };
}

/**
 * Add a rule (respects max limit)
 */
export function addRule(rules: Rule[], title: string, body: string): Rule[] {
  if (rules.length >= MAX_RULES) {
    throw new Error(`Maximum of ${MAX_RULES} rules reached`);
  }
  const newRule = createRule(title, body);
  logActivity("rule_added", `Added rule: ${title}`, body, {
    ruleId: newRule.id,
  });
  return [...rules, newRule];
}

/**
 * Remove a rule by ID
 */
export function removeRule(rules: Rule[], id: string): Rule[] {
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    logActivity("rule_removed", `Removed rule: ${rule.title}`, undefined, {
      ruleId: id,
    });
  }
  return rules.filter((rule) => rule.id !== id);
}

/**
 * Get a rule by ID
 */
export function getRuleById(rules: Rule[], id: string): Rule | undefined {
  return rules.find((rule) => rule.id === id);
}

export function modifyRule(
  rules: Rule[],
  id: string,
  title: string,
  body: string,
): Rule[] {
  const rule = getRuleById(rules, id);
  if (!rule) {
    throw new Error(`No rule found with ID: ${id}`);
  }
  logActivity("rule_updated", `Updated rule: ${title}`, body, { ruleId: id });
  return rules.map((r) => {
    if (r.id === id) {
      return {
        ...r,
        title,
        body,
      };
    }
    return r;
  });
}

/**
 * Log a rule break
 */
export function logRuleBreak(rules: Rule[], id: string): Rule[] {
  return rules.map((rule) => {
    if (rule.id === id) {
      pushEvent({
        category: "rule",
        message: "Rule break: " + rule.title,
      });
      return {
        ...rule,
        breaks: [...rule.breaks, { timestamp: Date.now() }],
      };
    }
    return rule;
  });
}

/**
 * Mark all breaks as seen by agent
 */
export function markBreaksAsSeen(rules: Rule[], ruleId?: string): Rule[] {
  return rules.map((rule) => {
    if (ruleId && rule.id !== ruleId) {
      return rule;
    }
    return {
      ...rule,
      breaks: rule.breaks.map((brk) => ({ ...brk, seenByAgent: true })),
    };
  });
}

/**
 * Get unseen breaks (new breaks since agent last checked)
 */
export function getUnseenBreaks(
  rules: Rule[],
): { ruleId: string; ruleTitle: string; breaks: RuleBreak[] }[] {
  const unseenBreaks: {
    ruleId: string;
    ruleTitle: string;
    breaks: RuleBreak[];
  }[] = [];

  for (const rule of rules) {
    const unseen = rule.breaks.filter((brk) => !brk.seenByAgent);
    if (unseen.length > 0) {
      unseenBreaks.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        breaks: unseen,
      });
    }
  }

  return unseenBreaks;
}

/**
 * Get total break count for a rule
 */
export function getBreakCount(rule: Rule): number {
  return rule.breaks.length;
}

/**
 * Get break count in a time range
 */
export function getBreakCountInRange(
  rule: Rule,
  startTime: number,
  endTime: number,
): number {
  return rule.breaks.filter(
    (brk) => brk.timestamp >= startTime && brk.timestamp <= endTime,
  ).length;
}

/**
 * Calculate streak in days for a single rule
 */
export function getStreak(rule: Rule): number {
  const now = Date.now();
  let lastBreakTime = rule.createdAt;

  if (rule.breaks.length > 0) {
    lastBreakTime = rule.breaks[rule.breaks.length - 1].timestamp;
  }

  const diffMs = now - lastBreakTime;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculate global streak across all rules
 */
export function getGlobalStreak(rules: Rule[]): number {
  if (rules.length === 0) return 0;

  const now = Date.now();
  let lastBreakTime = 0;
  let hasBreaks = false;

  // Find the most recent break across all rules
  for (const rule of rules) {
    if (rule.breaks.length > 0) {
      const ruleLastBreak = rule.breaks[rule.breaks.length - 1].timestamp;
      if (ruleLastBreak > lastBreakTime) {
        lastBreakTime = ruleLastBreak;
        hasBreaks = true;
      }
    }
  }

  // If no breaks ever, find the earliest created rule
  if (!hasBreaks) {
    let earliestCreated = Number.MAX_SAFE_INTEGER;
    for (const rule of rules) {
      if (rule.createdAt < earliestCreated) {
        earliestCreated = rule.createdAt;
      }
    }
    lastBreakTime = earliestCreated;
  }

  const diffMs = now - lastBreakTime;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
