import z from "zod";
import { Agent } from "./agent";
import { tool, Tool } from "./models";

type Agentdef = {
  name: string;
  reasoning: "low" | "medium" | "high" | "minimal";
  description: string;
  agent: Agent;
};

export function subAgentsTool(agents: Agentdef[]): Tool {
  return tool({
    name: "invokeSubAgent",
    description: "Invoke a sub-agent by name and with an prompt",
    schema: {
      name: z.string(),
      prompt: z.string(),
    },
    call: async ({ name, prompt }) => {
      const agent = agents.find((a) => a.name === name);
      if (!agent) {
        return `No agent found with name "${name}"`;
      }
      agent.agent.context.conversation = [];
      await agent.agent.act(
        {
          content: [{ type: "text", text: prompt }],
          type: "user",
        },
        {
          workflow_name: "SubAgent-" + name,
          reasoning: agent.reasoning,
        },
      );
      const res =
        agent.agent.context.conversation[
          agent.agent.context.conversation.length - 1
        ];
      return res.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
    },
  });
}

export function subAgentTool(name: string, desc: string, agent: Agent): Tool {
  return tool({
    name: name,
    description: `Invoke a ${name} Sub Agent\n${desc}`,
    schema: { input: z.string() },
    call: async ({ input }) => {
      agent.context.conversation = [];
      await agent.act(
        {
          content: [{ type: "text", text: input }],
          type: "user",
        },
        {
          workflow_name: "SubAgent-" + name,
        },
      );
      const res =
        agent.context.conversation[agent.context.conversation.length - 1];
      return res.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
    },
  });
}

export function getAgentPrompt(agents: Agentdef[]): string {
  return `
${agents.map((a) => `${a.name}: ${a.description}`).join("\n")}
`;
}
