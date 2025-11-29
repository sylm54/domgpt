import { Agent } from "@/lib/agent";
import { systemContext } from "@/lib/context";
import { model, config } from "@/config";
import { tool } from "@/lib/models";
import { z } from "zod";
import {
  loadPhases,
  savePhases,
  addPhase,
  updatePhase,
  removePhase,
  clearPhases,
} from "@/lib/phase";
import type { Phase } from "@/config";
import { MODEL_STORAGE } from "@/pages/settings/view";
import { OpenRouterModel } from "@/lib/models/openrouterv2";
import { fetch } from "@tauri-apps/plugin-http";
import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { API_KEY_STORAGE } from "@/App";

const DEFAULT_PHASE_PLANNER_PROMPT = `
You are a Phase Planning Assistant helping the user create a personalized journey with phases.

Your job is to:
1. Understand the user's goals and needs through conversation
2. Create meaningful phases that will guide them through their journey
3. Each phase should have a clear title, user-facing description, agent instructions, and a graduation challenge

When creating phases:
- Start with foundational phases and progress to more advanced ones
- Make each phase achievable but meaningful
- Graduation challenges should be concrete and measurable
- Ask clarifying questions if needed to create better phases

Use the available tools to create, edit, and manage phases based on the conversation.
Always show the user the current phases after making changes so they can provide feedback.

When the user is satisfied with their phases, let them know they can click "Continue" to proceed.
`.trim();

// Tools for phase management
const getPhasesTool = tool({
  name: "getPhases",
  description: "Get all current phases",
  schema: {},
  call: async () => {
    const phases = loadPhases();
    if (phases.length === 0) {
      return "No phases have been created yet.";
    }
    return JSON.stringify(phases, null, 2);
  },
});

const createPhaseTool = tool({
  name: "createPhase",
  description:
    "Create a new phase and add it to the journey. Use this to add phases based on user requirements.",
  schema: {
    title: z.string().describe("The title of the phase"),
    user_description: z
      .string()
      .describe("Description shown to the user explaining this phase"),
    agent_prompt: z
      .string()
      .describe(
        "Instructions for the AI agent on how to guide the user during this phase",
      ),
    challenge_title: z
      .string()
      .describe("Title of the graduation challenge for this phase"),
    challenge_content: z
      .string()
      .describe(
        "Detailed description of what the user needs to accomplish to complete this phase",
      ),
  },
  call: async ({
    title,
    user_description,
    agent_prompt,
    challenge_title,
    challenge_content,
  }) => {
    const phase: Phase = {
      title,
      user_description,
      agent_prompt,
      graduation_challenge: {
        title: challenge_title,
        content: challenge_content,
      },
    };
    addPhase(phase);
    const phases = loadPhases();
    return `Phase "${title}" created successfully. Total phases: ${phases.length}`;
  },
});

const updatePhaseTool = tool({
  name: "updatePhase",
  description: "Update an existing phase by its index (0-based)",
  schema: {
    index: z.number().describe("The index of the phase to update (0-based)"),
    title: z.string().describe("The new title of the phase"),
    user_description: z.string().describe("New description shown to the user"),
    agent_prompt: z.string().describe("New instructions for the AI agent"),
    challenge_title: z
      .string()
      .describe("New title of the graduation challenge"),
    challenge_content: z
      .string()
      .describe("New description of the graduation challenge"),
  },
  call: async ({
    index,
    title,
    user_description,
    agent_prompt,
    challenge_title,
    challenge_content,
  }) => {
    const phases = loadPhases();
    if (index < 0 || index >= phases.length) {
      return `Invalid phase index: ${index}. Valid range is 0 to ${phases.length - 1}`;
    }
    const phase: Phase = {
      title,
      user_description,
      agent_prompt,
      graduation_challenge: {
        title: challenge_title,
        content: challenge_content,
      },
    };
    updatePhase(index, phase);
    return `Phase ${index} ("${title}") updated successfully.`;
  },
});

const removePhaseTool = tool({
  name: "removePhase",
  description: "Remove a phase by its index (0-based)",
  schema: {
    index: z.number().describe("The index of the phase to remove (0-based)"),
  },
  call: async ({ index }) => {
    const phases = loadPhases();
    if (index < 0 || index >= phases.length) {
      return `Invalid phase index: ${index}. Valid range is 0 to ${phases.length - 1}`;
    }
    const removedTitle = phases[index].title;
    removePhase(index);
    return `Phase ${index} ("${removedTitle}") removed successfully. Remaining phases: ${loadPhases().length}`;
  },
});

const clearPhasesTool = tool({
  name: "clearPhases",
  description: "Remove all phases and start fresh",
  schema: {},
  call: async () => {
    clearPhases();
    return "All phases have been cleared.";
  },
});

const reorderPhasesTool = tool({
  name: "reorderPhases",
  description:
    "Reorder all phases by providing the new order as an array of indices",
  schema: {
    newOrder: z
      .array(z.number())
      .describe(
        "Array of current indices in the desired new order. E.g., [2, 0, 1] would move phase 2 to first position",
      ),
  },
  call: async ({ newOrder }) => {
    const phases = loadPhases();
    if (newOrder.length !== phases.length) {
      return `Invalid order: expected ${phases.length} indices, got ${newOrder.length}`;
    }
    const uniqueIndices = new Set(newOrder);
    if (uniqueIndices.size !== phases.length) {
      return "Invalid order: indices must be unique";
    }
    for (const idx of newOrder) {
      if (idx < 0 || idx >= phases.length) {
        return `Invalid index in order: ${idx}`;
      }
    }
    const reorderedPhases = newOrder.map((idx) => phases[idx]);
    savePhases(reorderedPhases);
    return "Phases reordered successfully.";
  },
});

const phase_planner_tools = [
  getPhasesTool,
  createPhaseTool,
  updatePhaseTool,
  removePhaseTool,
  clearPhasesTool,
  reorderPhasesTool,
];

/**
 * Get the phase planner system prompt from config, falling back to default
 */
export function getPhasePlannerPrompt(): string {
  return config.sysprompts?.phase_planner_agent ?? DEFAULT_PHASE_PLANNER_PROMPT;
}

/**
 * Get the default phase planner system prompt
 */
export function getDefaultPhasePlannerPrompt(): string {
  return DEFAULT_PHASE_PLANNER_PROMPT;
}

/**
 * Create a phase planner agent using the system prompt from config
 */
export function createPhasePlannerAgent(): Agent {
  const systemPrompt = getPhasePlannerPrompt();

  const openRouter = new OpenRouter({
    apiKey: localStorage.getItem("openrouter_api_key"),
    httpClient: new HTTPClient({
      fetcher: fetch,
    }),
  });
  const model = new OpenRouterModel(
    openRouter,
    localStorage.getItem(MODEL_STORAGE) || "x-ai/grok-4.1-fast",
  );
  return new Agent(systemContext(systemPrompt), model, phase_planner_tools);
}

/**
 * Pre-configured phase planner agent instance using config system prompt
 */
export const phase_planner_agent = createPhasePlannerAgent();
