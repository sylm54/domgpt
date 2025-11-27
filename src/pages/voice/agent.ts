import { tool } from "@/lib/models";
import z from "zod";
import {
  loadAssignments,
  saveAssignments,
  loadScores,
  VoiceAssignment,
} from "./types";

export const voice_tools = [
  tool({
    name: "add_voice_assignment",
    description: "Add a new voice training assignment/phrase for the user to practice.",
    schema: {
      phrase: z.string().describe("The phrase or sentence to practice."),
      targetPitch: z.string().optional().describe("Target pitch description (e.g., 'High', '220Hz+')."),
      targetTone: z.string().optional().describe("Target tone description (e.g., 'Soft', 'Breathy')."),
    },
    call: async (args) => {
      const assignments = loadAssignments();
      const newAssignment: VoiceAssignment = {
        id: crypto.randomUUID(),
        phrase: args.phrase,
        targetPitch: args.targetPitch,
        targetTone: args.targetTone,
        completed: false,
      };
      assignments.push(newAssignment);
      saveAssignments(assignments);
      return `Added assignment: "${args.phrase}"`;
    },
  }),
  tool({
    name: "get_voice_assignments",
    description: "Get the list of current voice training assignments.",
    schema: {},
    call: async () => {
      const assignments = loadAssignments();
      return JSON.stringify(assignments, null, 2);
    },
  }),
  tool({
    name: "get_voice_scores",
    description: "Get the recent voice training scores and feedback.",
    schema: {},
    call: async () => {
      const scores = loadScores();
      // Return last 10 scores
      return JSON.stringify(scores.slice(-10), null, 2);
    },
  }),
];
