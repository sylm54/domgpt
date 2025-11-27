import type { Context } from "./context";
import type { Model, Tool, ChatMessage, GenerationOptions } from "./models";
import { logWorkflow } from "../agents/debug";

export class Agent {
  context: Context;
  model: Model;
  tools: Tool[];

  constructor(context: Context, model: Model, tools: Tool[] = []) {
    this.context = context;
    this.model = model;
    this.tools = tools;
  }

  /**
   * Run the agent using the current context and tools.
   * - Builds the message list from context.system and context.conversation
   * - Streams intermediate progress to context.in_progress via onProgress
   * - Appends the final assistant message to context.conversation and clears in_progress
   */
  async act(message: ChatMessage, options?: GenerationOptions & { workflow_name?: string }): Promise<void> {
    if (options?.workflow_name) {
      console.group(options.workflow_name);
    }
    try {
      const messages: ChatMessage[] = [
        ...this.context.system,
        ...this.context.conversation,
        message,
      ];
      this.context.add_conversation(message);
      try {
        const final = await this.model.act(
          messages.map((m) =>
            m.type === "event" ? { ...m, type: "user" } : m,
          ),
          this.tools,
          options,
          (intermediate: ChatMessage) => {
            this.context.in_progress = intermediate;
          },
        );
        this.context.add_conversation(final);
        if (options?.workflow_name) {
          logWorkflow({
            name: options.workflow_name,
            system: this.context.system.flatMap((m) => m.content).filter((m) => m.type === "text").map((m) => m.text).join("\n"),
            input: message.content.filter((m) => m.type === "text").map((m) => m.text).join("\n"),
            output: final.content.filter((m) => m.type === "text").map((m) => m.text).join("\n"),
            tools: final.content.filter((m) => m.type === "tool").map((m) => ({
              name: m.tool,
              input: m.tool_input,
              output: m.tool_output + ""
            }))
          })
        }
      } finally {
        this.context.in_progress = undefined;
      }
    } finally {
      if (options?.workflow_name) {
        console.groupEnd();
      }
    }
  }
}
