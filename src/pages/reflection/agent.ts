import { tool } from "@/lib/models";
import z from "zod";
import * as mod from "./types";

export const reflection_tools = [
  tool({
    name: "reflection_list_prompts",
    description:
      "List the current root reflection prompts (the prompts used when saving new reflections).",
    schema: {},
    call: async () => {
      try {
        const data = mod.loadReflectionData();
        return JSON.stringify({ prompts: data.prompts });
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    },
  }),
  tool({
    name: "reflection_get_prompt",
    description:
      "Get a single prompt by index (0, 1, or 2) from the current root prompts.",
    schema: {
      index: z.number().int().min(0).max(2),
    },
    call: async ({ index }) => {
      try {
        const data = mod.loadReflectionData();
        const prompt = data.prompts[index];
        if (typeof prompt !== "string") {
          return JSON.stringify({ error: "Prompt not found at that index" });
        }
        return JSON.stringify({ index, prompt });
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    },
  }),
  tool({
    name: "reflection_update_prompt",
    description:
      "Update one of the root prompts at the given index (0, 1, or 2). This saves the updated prompts to storage but does not modify already-saved reflection records.",
    schema: {
      index: z.number().int().min(0).max(2),
      new_text: z.string().min(1),
    },
    call: async ({ index, new_text }) => {
      try {
        const data = mod.loadReflectionData();
        const updated = mod.updatePrompt(data, index, new_text);
        mod.saveReflectionData(updated);
        return JSON.stringify({
          success: true,
          index,
          new_prompts: updated.prompts,
        });
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    },
  }),
  tool({
    name: "reflection_get_prompts_for_date",
    description:
      "Get the snapshot of prompts that were saved with the reflection for a specific day relative to today (days_ago: 0 = today). Includes the saved responses (answers).",
    schema: {
      days_ago: z.number().int().min(0),
    },
    call: async ({ days_ago }) => {
      try {
        const data = mod.loadReflectionData();
        const date = mod.getRelativeDateString(days_ago);
        const record = mod.getReflectionRecordForDate(data, date);
        if (!record) {
          return JSON.stringify({
            error: "No reflection found for that date",
            days_ago,
            date,
          });
        }
        return JSON.stringify({
          days_ago,
          prompts: record.prompts,
          answers: record.responses,
        });
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    },
  }),
];
