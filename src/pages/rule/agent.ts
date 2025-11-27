import { tool } from "@/lib/models";
import z from "zod";
import * as mod from "./types";
export const rule_tools = [
  tool({
    name: "RulesList",
    description: "Return all saved rules",
    schema: {},
    call: async () => {
      const rules = mod.loadRules();
      return rules;
    },
  }),
  tool({
    name: "RulesCreate",
    description: "Create a new rule with a title and body",
    schema: {
      title: z.string(),
      body: z.string(),
    },
    call: async ({ title, body }) => {
      const rules = mod.loadRules();
      const newRule = mod.createRule(title, body);
      const updated = [...rules, newRule];
      mod.saveRules(updated);
      return newRule;
    },
  }),
  tool({
    name: "RulesRemove",
    description: "Remove a rule by its ID",
    schema: {
      id: z.string(),
    },
    call: async ({ id }) => {
      const rules = mod.loadRules();
      const exists = mod.getRuleById(rules, id);
      if (!exists) {
        return { success: false, error: `No rule with id ${id} found` };
      }
      const updated = mod.removeRule(rules, id);
      mod.saveRules(updated);
      return { success: true, rules: updated };
    },
  }),
  tool({
    name: "RulesModify",
    description: "Modify a rule's title and/or body by ID",
    schema: {
      id: z.string(),
      title: z.string().optional(),
      body: z.string().optional(),
    },
    call: async ({ id, title, body }) => {
      const rules = mod.loadRules();
      const rule = mod.getRuleById(rules, id);
      if (!rule) {
        return { success: false, error: `No rule with id ${id} found` };
      }
      const updated = rules.map((r) =>
        r.id === id
          ? { ...r, title: title ?? r.title, body: body ?? r.body }
          : r,
      );
      mod.saveRules(updated);
      return { success: true, rule: mod.getRuleById(updated, id) };
    },
  }),
  // tool({
  //   name: "RulesGetUnseenBreaks",
  //   description: "Get breaks that the agent has not yet seen",
  //   schema: {},
  //   call: async () => {
  //     const rules = mod.loadRules();
  //     const unseen = mod.getUnseenBreaks(rules);
  //     return unseen;
  //   },
  // }),
  // tool({
  //   name: "RulesMarkBreaksAsSeen",
  //   description:
  //     "Mark breaks as seen by the agent. Optionally provide a ruleId to mark only that rule.",
  //   schema: {
  //     ruleId: z.string().optional(),
  //   },
  //   call: async ({ ruleId }) => {
  //     const rules = mod.loadRules();
  //     const updated = mod.markBreaksAsSeen(rules, ruleId);
  //     mod.saveRules(updated);
  //     return { success: true };
  //   },
  // }),
  tool({
    name: "RulesGetStats",
    description:
      "Get break statistics for a rule. startTime and endTime, if provided, are interpreted as days relative to now (0 = now, 1 = 1 day ago). If both are provided the range between them is used; otherwise returns total and last-24h counts.",
    schema: {
      id: z.string(),
      // numbers represent days relative to now
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    },
    call: async ({ id, startTime, endTime }) => {
      const rules = mod.loadRules();
      const rule = mod.getRuleById(rules, id);
      if (!rule) {
        return { success: false, error: `No rule with id ${id} found` };
      }
      const total = mod.getBreakCount(rule);
      let inRange = null;

      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();

      // If both startTime and endTime provided, treat them as days relative to now
      if (typeof startTime === "number" && typeof endTime === "number") {
        const startTs = now - startTime * MS_PER_DAY;
        const endTs = now - endTime * MS_PER_DAY;
        const rangeStart = Math.min(startTs, endTs);
        const rangeEnd = Math.max(startTs, endTs);
        inRange = mod.getBreakCountInRange(rule, rangeStart, rangeEnd);
      } else if (typeof startTime === "number") {
        // startTime days ago until now
        const startTs = now - startTime * MS_PER_DAY;
        inRange = mod.getBreakCountInRange(rule, startTs, now);
      } else if (typeof endTime === "number") {
        // endTime days ago until now
        const endTs = now - endTime * MS_PER_DAY;
        inRange = mod.getBreakCountInRange(rule, endTs, now);
      } else {
        // default: last 24 hours
        const dayAgo = now - MS_PER_DAY;
        inRange = mod.getBreakCountInRange(rule, dayAgo, now);
      }

      return {
        success: true,
        ruleId: id,
        totalBreaks: total,
        breakCountInRange: inRange,
      };
    },
  }),
];
