import { tool } from "@/lib/models";
import { z } from "zod";
import { addRitual, loadRituals, markRitualDone, removeRitual } from "./types";

export const ritual_tools = [
  tool({
    name: "add_ritual",
    description: "Create a new ritual with a schedule and steps.",
    schema: {
      title: z
        .string()
        .describe("Title of the ritual (e.g., 'Morning Routine')"),
      start_time: z.string().describe("Start time in HH:MM format (24h)"),
      end_time: z.string().describe("End time in HH:MM format (24h)"),
      days: z
        .array(z.number())
        .describe("Days of the week (0=Sun, 1=Mon, ..., 6=Sat)"),
      steps: z.array(z.string()).describe("List of steps in the ritual"),
    },
    call: async (args) => {
      try {
        const ritual = addRitual(
          args.title,
          {
            start: args.start_time,
            end: args.end_time,
            days: args.days,
          },
          args.steps,
        );
        return `Ritual '${ritual.title}' created successfully with ID: ${ritual.id}`;
      } catch (e) {
        return `Error creating ritual: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  }),
  tool({
    name: "remove_ritual",
    description: "Remove a ritual by its ID.",
    schema: {
      id: z.string().describe("ID of the ritual to remove"),
    },
    call: async (args) => {
      removeRitual(args.id);
      return `Ritual with ID ${args.id} removed.`;
    },
  }),
  tool({
    name: "get_rituals",
    description: "Get a list of all rituals and their status.",
    schema: {},
    call: async () => {
      const rituals = loadRituals();
      return JSON.stringify(rituals, null, 2);
    },
  }),
];
