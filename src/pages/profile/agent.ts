import { tool } from "@/lib/models";
import z from "zod";
import * as mod from "./types";

export const profile_tools = [
  tool({
    name: "Example",
    description: "desc",
    schema: {
      some_arg: z.string(),
    },
    call: async ({ some_arg }) => {
      return "Some arg: " + some_arg;
    },
  }),
  tool({
    name: "getProfile",
    description: "Get the current profile data.",
    schema: {},
    call: async () => {
      return mod.loadProfileData();
    },
  }),
  tool({
    name: "setTitle",
    description: "Update the profile title.",
    schema: {
      title: z.string(),
    },
    call: async ({ title }) => {
      const current = mod.loadProfileData();
      const updated = mod.updateTitle(current, title);
      mod.saveProfileData(updated);
      return updated;
    },
  }),
  tool({
    name: "setDescription",
    description: "Update the profile description.",
    schema: {
      description: z.string(),
    },
    call: async ({ description }) => {
      const current = mod.loadProfileData();
      const updated = mod.updateDescription(current, description);
      mod.saveProfileData(updated);
      return updated;
    },
  }),
  tool({
    name: "addAchievement",
    description: "Add a new achievement to the profile",
    schema: {
      title: z.string(),
      description: z.string(),
    },
    call: async ({ title, description }) => {
      const current = mod.loadProfileData();
      const updated = mod.addAchievement(current, title, description);
      mod.saveProfileData(updated);
      // return the newly added achievement (the last one)
      const added = updated.achievements[updated.achievements.length - 1];
      return added ?? null;
    },
  }),
  tool({
    name: "removeAchievement",
    description: "Remove an achievement by id from the profile.",
    schema: {
      id: z.string(),
    },
    call: async ({ id }) => {
      const current = mod.loadProfileData();
      const updated = mod.removeAchievement(current, id);
      mod.saveProfileData(updated);
      return { success: true, removedId: id };
    },
  }),
  tool({
    name: "Profile: List Achievements",
    description: "Return all achievements sorted by date (newest first).",
    schema: {},
    call: async () => {
      const current = mod.loadProfileData();
      return mod.getAchievementsSortedByDate(current);
    },
  }),
];
