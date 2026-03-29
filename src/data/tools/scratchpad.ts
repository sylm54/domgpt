import { z } from "zod";
import type { Tool } from "@/lib/models";

export function useScratchpadTool(id: string): [string, Tool] {
	return [
		localStorage.getItem(`scratchpad${id}`) || "",
		{
			name: "writeScratchpad",
			description:
				"A tool for jotting down thoughts, ideas, and insights during the session. Use it to capture anything that might be useful later.",
			schema: {
				content: z.string(),
			},
			call: async ({ content }) => {
				localStorage.setItem(`scratchpad${id}`, content);
				return `Saved to scratchpad`;
			},
		},
	];
}
