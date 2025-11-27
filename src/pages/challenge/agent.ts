import { tool } from "@/lib/models";
import z from "zod";
import * as mod from "./types";

export const challenge_tools = [
  tool({
    name: "list_challenges",
    description: "List stored challenges",
    schema: {},
    call: async () => {
      const challenges = mod.loadChallenges();
      return challenges;
    },
  }),
  tool({
    name: "create_challenge",
    description: "Create a new challenge with a title and body",
    schema: {
      title: z.string(),
      body: z.string(),
    },
    call: async ({ title, body }) => {
      const challenges = mod.loadChallenges();

      // Enforce maximum number of concurrent challenges
      if (challenges.length >= mod.MAX_CHALLENGES) {
        return {
          success: false,
          error: `Maximum of ${mod.MAX_CHALLENGES} challenges reached`,
        };
      }

      try {
        const updated = mod.addChallenge(challenges, title, body);
        mod.saveChallenges(updated);
        return { success: true, challenges: updated };
      } catch (err: any) {
        return { success: false, error: err?.message ?? String(err) };
      }
    },
  }),
  tool({
    name: "remove_challenge",
    description: "Remove a challenge by id",
    schema: {
      id: z.string(),
    },
    call: async ({ id }) => {
      const challenges = mod.loadChallenges();
      const exists = mod.getChallengeById(challenges, id);
      if (!exists) {
        return { success: false, error: "Challenge not found" };
      }
      const updated = mod.removeChallenge(challenges, id);
      mod.saveChallenges(updated);
      return { success: true, challenges: updated };
    },
  }),
];
