import z from "zod";
import { ChatMessage, InteractiveSystemMessage, tool, Tool } from "./models";

export function memoryTool(key: string): [InteractiveSystemMessage, Tool] {
  const data = localStorage.getItem(key);
  return [
    {
      type: "interactive_system",
      callback: () => {
        return [
          {
            type: "text",
            text: `Memory: ${data}`,
          },
        ];
      },
      content: [],
    },
    tool({
      name: "setMemory",
      description: "Set the memory",
      schema: {
        data: z.string(),
      },
      call: async ({ data }) => {
        localStorage.setItem(key, data);
        return `Memory set`;
      },
    }),
  ];
}
