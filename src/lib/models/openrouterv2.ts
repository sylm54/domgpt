import type { OpenRouter } from "@openrouter/sdk";
import type {
  ChatMessageToolCall,
  Message,
  ToolDefinitionJson,
  ToolResponseMessage,
} from "@openrouter/sdk/models";
import z from "zod";
import {
  type ChatMessage,
  type GenerationOptions,
  type MessagePart,
  Model,
  type Tool,
} from ".";

/**
 * OpenRouterModel
 *
 * This implementation re-enables tool-calling with the OpenRouter SDK.
 * Key points:
 * - `toOpenRouterMessages(..., parse_tools = true)` carefully maps only the valid
 *   tool-related parts into the shapes the SDK expects:
 *     - assistant message can include `toolCalls: ChatMessageToolCall[]` entries
 *       where each call explicitly contains `type: "function"`, `id` (string),
 *       and `function: { name, arguments }` with `arguments` as a string.
 *     - tool response messages are emitted as messages with `role: "tool"`,
 *       `toolCallId` (string), and `content` (string).
 * - `act()` passes `tools` (as ToolDefinitionJson) to `router.chat.send()` and
 *   processes `response.message.toolCalls` to execute local tool functions,
 *   then feeds tool outputs back into the conversation as `tool` messages.
 * - Defensive normalization is applied so values that must be strings are
 *   converted to strings (ids, arguments, content).
 */

export class OpenRouterModel extends Model {
  router?: OpenRouter;
  modelname: string;
  constructor(router: OpenRouter | undefined, modelname: string) {
    super();
    this.router = router;
    this.modelname = modelname;
  }

  setRouter(router: OpenRouter) {
    this.router = router;
  }

  setModelName(modelname: string) {
    this.modelname = modelname;
  }

  /**
   * Convert internal ChatMessage[] to the OpenRouter SDK Message[] format.
   * When `parse_tools` is true, assistant messages that contain `tool` parts
   * will be emitted as an assistant message with `toolCalls` plus separate
   * `tool` role messages for any available tool outputs.
   */
  toOpenRouterMessages(messages: ChatMessage[], parse_tools = true): Message[] {
    return messages.flatMap((m) => {
      if (m.type === "assistant") {
        const textContent = m.content
          .filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("");

        if (!parse_tools) {
          return {
            role: "assistant",
            content: textContent,
          } as Message;
        }

        // Gather tool parts (if any)
        const toolParts = m.content.filter((p) => p.type === "tool");

        // Build the base assistant message
        const assistantMsg: Message = {
          role: "assistant",
          content: textContent,
        } as Message;

        if (toolParts.length === 0) {
          return assistantMsg;
        }

        // Map tool parts -> ChatMessageToolCall entries
        const toolCalls: ChatMessageToolCall[] = toolParts.map((p) => {
          // ensure id and arguments are strings
          const id =
            typeof (p as any).id === "string"
              ? (p as any).id
              : String((p as any).id);
          const args =
            typeof (p as any).tool_input === "string"
              ? (p as any).tool_input
              : JSON.stringify((p as any).tool_input ?? {});
          return {
            // include explicit type the SDK expects for a function call
            type: "function" as unknown as string,
            id,
            function: {
              name: (p as any).tool,
              arguments: args,
            },
          } as ChatMessageToolCall;
        });

        // Attach toolCalls to assistant message
        (assistantMsg as any).toolCalls = toolCalls;

        // For any existing tool outputs, add corresponding tool role messages
        const toolResponseMessages: ToolResponseMessage[] = toolParts.map(
          (p) => {
            const id =
              typeof (p as any).id === "string"
                ? (p as any).id
                : String((p as any).id);
            const content =
              typeof (p as any).tool_output === "string"
                ? (p as any).tool_output
                : typeof (p as any).tool_output === "undefined"
                  ? ""
                  : JSON.stringify((p as any).tool_output);
            return {
              role: "tool",
              toolCallId: id,
              content,
            } as ToolResponseMessage;
          },
        );

        return [assistantMsg, ...toolResponseMessages];
      } else if (m.type === "user") {
        return {
          role: "user",
          content: m.content
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(""),
        } as Message;
      } else if (m.type === "system") {
        return {
          role: "system",
          content: m.content
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(""),
        } as Message;
      } else if (m.type === "event") {
        // Treat events like user messages for the model
        return {
          role: "user",
          content: m.content
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(""),
        } as Message;
      } else if (m.type === "interactive_system") {
        return {
          role: "system",
          content: m
            .callback()
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join(""),
        } as Message;
      } else {
        throw new Error("Invalid message type");
      }
    });
  }

  async generate(
    messages: ChatMessage[],
    options?: GenerationOptions,
  ): Promise<ChatMessage> {
    console.group("generate");
    try {
      console.groupCollapsed("input");
      for (const m of messages) {
        console.log(
          m.type,
          m.content
            .map((c) => {
              if (c.type === "tool") {
                console.log("tool", c);
                return `tool: ${c.tool}`;
              }
              return `${c.type}:\n${c.text}`;
            })
            .join("\n"),
        );
      }
      console.groupEnd();
      console.log("options", options);
      if (!this.router) {
        throw new Error("OpenRouterModel router not set");
      }
      const response = await this.router.chat.send({
        model: this.modelname,
        messages: this.toOpenRouterMessages(messages, false),
        stream: false,
        maxTokens: options?.max_tokens,
        temperature: options?.temperature,
        reasoning: {
          effort: options?.reasoning,
          summary: "detailed",
        },
      });
      const result: MessagePart[] = [];
      if (
        (response.choices[0].message.reasoning?.toString().trim().length ?? 0) >
        0
      ) {
        result.push({
          type: "thinking",
          text: `${response.choices[0].message.reasoning}`,
        });
      }
      if (
        (response.choices[0].message.content?.toString().trim().length ?? 0) > 0
      ) {
        result.push({
          type: "text",
          text: `${response.choices[0].message.content}`,
        });
      }
      console.log("output", result);
      return {
        type: "assistant",
        content: result,
        stats: {
          intokens: response.usage?.promptTokens,
          outtokens: response.usage?.completionTokens,
        },
      };
    } finally {
      console.groupEnd();
    }
  }

  /**
   * act()
   *
   * - Sends messages to the SDK with `tools` provided.
   * - Handles `response.message.toolCalls` by executing matching local tools,
   *   injecting their results back into the conversation as `tool` messages,
   *   and continuing the loop until the model no longer requests tool calls.
   */
  async act(
    messages: ChatMessage[],
    tools: Tool[],
    options?: GenerationOptions,
    onProgress?: (intermediate: ChatMessage) => void,
  ): Promise<ChatMessage> {
    console.group("act");
    try {
      console.groupCollapsed("input");
      for (const m of messages) {
        if (m.type === "interactive_system") {
          console.log("system", m.callback());
          continue;
        }
        console.group(m.type);
        for (const c of m.content) {
          if (c.type === "tool") {
            console.log("tool", c);
            continue;
          }
          console.log(c.type, c.text);
        }
        console.groupEnd();
      }
      console.groupEnd();
      console.groupCollapsed("tools");
      for (const t of tools) {
        console.log(t.name, t);
      }
      console.groupEnd();
      console.log("options", options);
      if (!this.router) {
        throw new Error("OpenRouterModel router not set");
      }
      // Start by converting our current conversation to SDK messages,
      // including any prior tool messages we may have in the conversation.
      const input: Message[] = this.toOpenRouterMessages(messages, true);

      const result: ChatMessage = {
        type: "assistant",
        content: [],
        stats: {
          intokens: 0,
          outtokens: 0,
        },
      };

      // Build tool definitions in the shape SDK expects
      const tooldefs: ToolDefinitionJson[] = tools.map((t) => {
        return {
          type: "function",
          function: {
            parameters: z.toJSONSchema(z.object(t.schema as any)),
            name: t.name,
            description: t.description,
          },
        } as ToolDefinitionJson;
      });
      console.log("Starting model call");
      // Loop until model stops asking for tool_calls
      while (true) {
        const res = await this.router.chat.send({
          model: this.modelname,
          messages: input,
          tools: tooldefs,

          stream: false,
          maxTokens: options?.max_tokens,
          temperature: options?.temperature,
          reasoning: {
            effort: options?.reasoning,
            summary: "detailed",
          },
        });

        const response = res.choices[0];
        // Push the model's message into the conversation stream so subsequent
        // calls include it. Ensure response.message exists.
        if (response && response.message) {
          input.push(response.message);
        }

        // Append reasoning/text to the progressive result
        if ((response.message.reasoning?.toString().trim().length ?? 0) > 0) {
          result.content.push({
            type: "thinking",
            text: `${response.message.reasoning}`,
          });
          console.log(`think:\n${response.message.reasoning}`);
        }
        if ((response.message.content?.toString().trim().length ?? 0) > 0) {
          result.content.push({
            type: "text",
            text: `${response.message.content}`,
          });
          console.log(`think:\n${response.message.content}`);
        }

        if (res.usage && result.stats) {
          result.stats.intokens! += res.usage.promptTokens ?? 0;
          result.stats.outtokens! += res.usage.completionTokens ?? 0;
        }

        onProgress?.(result);

        // If the model asked to call tools, process them sequentially.
        if (
          response.finishReason === "tool_calls" &&
          Array.isArray(response.message.toolCalls) &&
          response.message.toolCalls.length > 0
        ) {
          for (const call of response.message.toolCalls) {
            // Defensive normalization
            const callId =
              typeof call.id === "string" ? call.id : String(call.id);
            const fname = call.function?.name;
            const fargsStr =
              typeof call.function?.arguments === "string"
                ? call.function!.arguments
                : JSON.stringify(call.function?.arguments ?? {});
            console.groupCollapsed(`Tool Call: ${fname}`);
            console.log("Input:", fargsStr);
            if (!fname) {
              // Push a tool-role message indicating a malformed call
              input.push({
                role: "tool",
                toolCallId: callId,
                content: `Malformed tool call (no function name)`,
              });
              // Also append to result content for UI
              result.content.push({
                type: "tool",
                id: callId,
                tool: "unknown",
                tool_input: fargsStr,
                tool_output: `Malformed tool call (no function name)`,
              });
              console.log("Output:", "Malformed tool call (no function name)");
              console.groupEnd();
              onProgress?.(result);
              continue;
            }

            // Find the matching tool implementation
            const tooldefinition = tools.find((t) => t.name === fname);
            if (!tooldefinition) {
              const notFoundMsg = `Tool ${fname} not found`;
              input.push({
                role: "tool",
                toolCallId: callId,
                content: notFoundMsg,
              });
              result.content.push({
                type: "tool",
                id: callId,
                tool: fname,
                tool_input: fargsStr,
                tool_output: notFoundMsg,
              });
              onProgress?.(result);
              console.log("Output:", notFoundMsg);
              console.groupEnd();
              continue;
            }

            // Record the requested tool call in the assistant result content
            result.content.push({
              type: "tool",
              id: callId,
              tool: fname,
              tool_input: fargsStr,
            });

            onProgress?.(result);

            // Execute the tool: parse arguments and validate using the tool schema
            let toolinput: any = {};
            try {
              toolinput = JSON.parse(fargsStr || "{}");
            } catch {
              toolinput = {};
            }

            try {
              const parsedArgs = Object.fromEntries(
                Object.keys(tooldefinition.schema).map((k) => {
                  const parser = tooldefinition.schema[k];
                  // apply parser.parse defensively
                  const rawVal = toolinput ? toolinput[k] : undefined;
                  let parsed: any;
                  try {
                    parsed = parser.parse(rawVal);
                  } catch (err) {
                    // If parse fails, rethrow with context
                    throw new Error(
                      `Tool "${tooldefinition.name}" argument "${k}" parse error: ${String(
                        (err as Error)?.message ?? err,
                      )}`,
                    );
                  }
                  return [k, parsed];
                }),
              );

              const callResult = await tooldefinition.call(parsedArgs);
              const toolresStr =
                typeof callResult === "string"
                  ? callResult
                  : JSON.stringify(callResult);

              // Attach the tool output to the last result.content entry
              const lastIdx2 = result.content.length - 1;
              if (
                lastIdx2 >= 0 &&
                (result.content[lastIdx2] as any).type === "tool"
              ) {
                (result.content[lastIdx2] as any).tool_output = toolresStr;
              } else {
                // If no prior tool entry exists, push one so UI can display output
                result.content.push({
                  type: "tool",
                  id: callId,
                  tool: fname,
                  tool_input: fargsStr,
                  tool_output: toolresStr,
                });
              }

              onProgress?.(result);

              // Add a tool-role message back into the conversation so the model
              // can observe the tool output on the next loop iteration
              input.push({
                role: "tool",
                toolCallId: callId,
                content: toolresStr,
              });
              console.log("Output:", toolresStr);
              console.groupEnd();
            } catch (err) {
              // Convert error to string safely
              let messageStr: string;
              if (err instanceof Error) {
                messageStr = err.message;
              } else {
                try {
                  messageStr = JSON.stringify(err);
                } catch {
                  messageStr = String(err);
                }
              }
              const errMsg = `Tool ${fname} error: ${messageStr}`;

              // Attach the error to the last content tool entry if present,
              // otherwise push a new tool entry containing the error info.
              const lastIdx = result.content.length - 1;
              if (
                lastIdx >= 0 &&
                (result.content[lastIdx] as any).type === "tool"
              ) {
                (result.content[lastIdx] as any).tool_output = errMsg;
              } else {
                result.content.push({
                  type: "tool",
                  id: callId,
                  tool: fname,
                  tool_input: fargsStr,
                  tool_output: errMsg,
                });
              }
              onProgress?.(result);
              input.push({
                role: "tool",
                toolCallId: callId,
                content: errMsg,
              });
              console.log("Output:", errMsg);
              console.groupEnd();
            }
          }

          // After processing all tool calls, continue the loop so the model can
          // observe the tool outputs and potentially produce new tool calls.
          continue;
        }

        // No more tool calls requested -> finished
        break;
      }

      return result;
    } finally {
      console.groupEnd();
    }
  }
}
