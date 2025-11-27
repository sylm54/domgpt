import { tool } from "@/lib/models";
import z from "zod";
import * as mod from "./types";
import { generateAudio } from "@/lib/tts/tts";
import { updateAudio } from "./types";
import { config, model } from "@/config";
import { systemMessage, userMessage } from "@/lib/context";
import { AudioScript } from "@/lib/tts/tts-rust";

export const affirm_tools = [
  tool({
    name: "createAudio",
    description: "Create an audio file from a prompt",
    schema: {
      name: z.string(),
      prompt: z.string(),
    },
    call: async ({ name, prompt }) => {
      const script = await generateAudio({
        title: name,
        prompt: prompt,
      });
      return `Generated audio file: ${script.title}\nSummary: ${script.summary}`;
    },
  }),
  tool({
    name: "listAudio",
    description: "List the Title and Description of all audio files",
    schema: {},
    call: async () => {
      const audios = mod.loadAudio();
      return `Audio files: ${audios.map((a) => `${a.title}: ${a.summary}`).join(", ")}`;
    },
  }),
  tool({
    name: "deleteAudio",
    description: "Delete an audio file",
    schema: {
      name: z.string(),
    },
    call: async ({ name }) => {
      const deleted = mod.deleteAudio((a) => a.title === name);
      if (!deleted) return "No audio file found";
      return `Deleted audio file: ${deleted.title}`;
    },
  }),
];
