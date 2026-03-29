import type OpenAI from "openai";

import { type ChatMessage, type GenerationOptions, type MessagePart, Model, type Tool } from ".";
import zod from "zod";

/**
 * NanoGPT Model - OpenAI-compatible client
 *
 * This class provides an OpenAI-compatible interface for interacting with NanoGPT models.
 * It follows the same pattern as OpenRouter but uses the standard OpenAI SDK.
 *
 * Example Usage:
 * ```ts
 * const client = new OpenAI({
 *   baseURL: "https://api.nanogpt.com/v1",
 *   apiKey: "your-api-key",
 * });
 * const model = new NanoGPTModel(client, "nano-gpt-model");
 * const response = await model.generate(messages, { temperature: 0.7 });
 * ```
 */
export class NanoGPTModel extends Model {
	client: OpenAI;
	modelname: string;
	baseURL?: string;

	/**
	 * Create a new NanoGPT model instance
	 * @param client - OpenAI SDK client instance configured for NanoGPT
	 * @param modelname - Name of the model to use
	 * @param baseURL - Optional base URL (can be set via client or separately)
	 */
	constructor(client: OpenAI, modelname: string, baseURL?: string) {
		super();
		this.client = client;
		this.modelname = modelname;
		this.baseURL = baseURL;
		if (baseURL) {
			this.client.baseURL = baseURL;
		}
	}

	/**
	 * Set or update the OpenAI client
	 * @param client - New OpenAI client instance
	 */
	setClient(client: OpenAI) {
		this.client = client;
	}

	/**
	 * Set or update the model name
	 * @param modelname - New model name to use
	 */
	setModelName(modelname: string) {
		this.modelname = modelname;
	}

	/**
	 * Set or update the base URL
	 * @param baseURL - New base URL for the API
	 */
	setBaseURL(baseURL: string) {
		this.baseURL = baseURL;
		this.client.baseURL = baseURL;
	}

	/**
	 * Convert internal ChatMessage[] to OpenAI SDK ChatCompletionMessageParam[] format.
	 * When `parse_tools` is true, assistant messages that contain `tool` parts
	 * will be emitted as an assistant message with `tool_calls` plus separate
	 * `tool` role messages for any available tool outputs.
	 *
	 * @param messages - Internal chat messages to convert
	 * @param parse_tools - Whether to parse and convert tool calls
	 * @returns Array of OpenAI-compatible messages
	 */
	toOpenAIMessages(
		messages: ChatMessage[],
		parse_tools = true
	): OpenAI.ChatCompletionMessageParam[] {
		return messages.flatMap((m) => {
			if (m.type === "assistant") {
				const textContent = m.content
					.filter((p) => p.type === "text")
					.map((p) => p.text)
					.join("");

				if (!parse_tools) {
					return {
						role: "assistant" as const,
						content: textContent,
					} as OpenAI.ChatCompletionMessageParam;
				}

				// Gather tool parts (if any)
				const toolParts = m.content.filter((p) => p.type === "tool");

				// Build the base assistant message
				const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = {
					role: "assistant",
					content: textContent || undefined,
				};

				if (toolParts.length === 0) {
					return assistantMsg;
				}

				// Map tool parts -> ChatCompletionMessageToolCall entries
				const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = toolParts.map((p) => {
					const id = typeof (p as any).id === "string" ? (p as any).id : String((p as any).id);
					const args =
						typeof (p as any).tool_input === "string"
							? (p as any).tool_input
							: JSON.stringify((p as any).tool_input ?? {});
					return {
						id,
						type: "function" as const,
						function: {
							name: (p as any).tool,
							arguments: args,
						},
					} as OpenAI.ChatCompletionMessageToolCall;
				});

				// Attach toolCalls to assistant message
				assistantMsg.tool_calls = toolCalls;

				// For any existing tool outputs, add corresponding tool role messages
				const toolResponseMessages: OpenAI.ChatCompletionToolMessageParam[] = toolParts.map((p) => {
					const id = typeof (p as any).id === "string" ? (p as any).id : String((p as any).id);
					const content =
						typeof (p as any).tool_output === "string"
							? (p as any).tool_output
							: typeof (p as any).tool_output === "undefined"
								? ""
								: JSON.stringify((p as any).tool_output);
					return {
						role: "tool" as const,
						tool_call_id: id,
						content,
					} as OpenAI.ChatCompletionToolMessageParam;
				});

				return [assistantMsg, ...toolResponseMessages];
			} else if (m.type === "user") {
				return {
					role: "user" as const,
					content: m.content
						.filter((p) => p.type === "text")
						.map((p) => p.text)
						.join(""),
				} as OpenAI.ChatCompletionMessageParam;
			} else if (m.type === "system") {
				return {
					role: "system" as const,
					content: m.content
						.filter((p) => p.type === "text")
						.map((p) => p.text)
						.join(""),
				} as OpenAI.ChatCompletionMessageParam;
			} else if (m.type === "event") {
				// Treat events like user messages for the model
				return {
					role: "user" as const,
					content: m.content
						.filter((p) => p.type === "text")
						.map((p) => p.text)
						.join(""),
				} as OpenAI.ChatCompletionMessageParam;
			} else if (m.type === "interactive_system") {
				return {
					role: "system" as const,
					content: m
						.callback()
						.filter((p) => p.type === "text")
						.map((p) => p.text)
						.join(""),
				} as OpenAI.ChatCompletionMessageParam;
			} else {
				throw new Error("Invalid message type");
			}
		});
	}

	/**
	 * Generate a response from chat messages without tool support
	 * @param messages - Array of chat messages
	 * @param options - Optional generation parameters
	 * @returns The new chat message from the assistant
	 */
	async generate(messages: ChatMessage[], options?: GenerationOptions): Promise<ChatMessage> {
		console.group("NanoGPT generate");
		try {
			console.groupCollapsed("input");
			for (const m of messages) {
				console.log(
					m.type,
					m.content
						.map((c) => {
							if (c.type === "tool") {
								return `tool: ${c.tool}`;
							}
							return `${c.type}:\n${c.text}`;
						})
						.join("\n")
				);
			}
			console.groupEnd();
			console.log("Model:", this.modelname, "Options:", options);

			const response = await this.client.chat.completions.create({
				model: this.modelname,
				messages: this.toOpenAIMessages(messages, false),
				stream: false,
				max_tokens: options?.max_tokens,
				temperature: options?.temperature,
				top_p: options?.top_p,
			});

			const result: MessagePart[] = [];
			const choice = response.choices[0];

			const content = choice.message.content?.trim() || "";
			if (content) {
				const thinkIndex = content.indexOf("</think>");
				if (thinkIndex !== -1) {
					const thinkingContent = content.substring(0, thinkIndex).trim();
					const regularContent = content.substring(thinkIndex + 8).trim();

					if (thinkingContent) {
						result.push({
							type: "thinking",
							text: thinkingContent,
						});
					}

					if (regularContent) {
						result.push({
							type: "text",
							text: regularContent,
						});
					}
				} else {
					result.push({
						type: "text",
						text: content,
					});
				}
			}

			console.log("output", result);
			return {
				type: "assistant",
				content: result,
				stats: {
					intokens: response.usage?.prompt_tokens,
					outtokens: response.usage?.completion_tokens,
				},
			};
		} finally {
			console.groupEnd();
		}
	}

	/**
	 * Perform agent work with tools
	 *
	 * - Sends messages to the OpenAI API with `tools` provided.
	 * - Handles `response.message.tool_calls` by executing matching local tools,
	 *   injecting their results back into the conversation as `tool` messages,
	 *   and continuing the loop until the model no longer requests tool calls.
	 *
	 * @param messages - Array of chat messages
	 * @param tools - Array of available tools
	 * @param options - Optional generation parameters
	 * @param onProgress - Optional callback for intermediate results
	 * @returns Agent action containing the response and any tool calls
	 */
	async act(
		messages: ChatMessage[],
		tools: Tool[],
		options?: GenerationOptions,
		onProgress?: (intermediate: ChatMessage) => void
	): Promise<ChatMessage> {
		console.group("NanoGPT act");
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
			console.log("Model:", this.modelname, "Options:", options);

			// Start by converting our current conversation to OpenAI messages,
			// including any prior tool messages we may have in the conversation.
			const input: OpenAI.ChatCompletionMessageParam[] = this.toOpenAIMessages(messages, true);

			const result: ChatMessage = {
				type: "assistant",
				content: [],
				stats: {
					intokens: 0,
					outtokens: 0,
				},
			};

			// Build tool definitions in the shape OpenAI SDK expects
			const tooldefs: OpenAI.ChatCompletionTool[] = tools.map((t) => {
				// Schema is expected to be an object with Zod parsers as values
				const schemaForJSON = t.schema ? zod.object(t.schema as any) : zod.object({});

				return {
					type: "function",
					function: {
						parameters: zod.toJSONSchema(schemaForJSON) as Record<string, any>,
						name: t.name,
						description: t.description,
					},
				} as OpenAI.ChatCompletionTool;
			});

			console.log("Starting model call");
			// Loop until model stops asking for tool_calls
			while (true) {
				const res = await this.client.chat.completions.create({
					model: this.modelname,
					messages: input,
					tools: tooldefs,
					stream: false,
					max_tokens: options?.max_tokens,
					temperature: options?.temperature,
					top_p: options?.top_p,
				});

				const choice = res.choices[0];

				// Push the model's message into the conversation stream so subsequent
				// calls include it.
				if (choice.message) {
					input.push(choice.message);
				}

				// Append text to the progressive result
				const content = choice.message.content?.trim() || "";
				if (content) {
					const thinkIndex = content.indexOf("</think>");
					if (thinkIndex !== -1) {
						const thinkingContent = content.substring(0, thinkIndex).trim();
						const regularContent = content.substring(thinkIndex + 8).trim();

						if (thinkingContent) {
							result.content.push({
								type: "thinking",
								text: thinkingContent,
							});
						}

						if (regularContent) {
							result.content.push({
								type: "text",
								text: regularContent,
							});
						}
					} else {
						result.content.push({
							type: "text",
							text: content,
						});
					}
					console.log(`text:\n${choice.message.content}`);
				}

				if (res.usage && result.stats) {
					result.stats.intokens = (result.stats.intokens ?? 0) + (res.usage.prompt_tokens ?? 0);
					result.stats.outtokens =
						(result.stats.outtokens ?? 0) + (res.usage.completion_tokens ?? 0);
				}

				onProgress?.(result);

				// If the model asked to call tools, process them sequentially.
				if (
					choice.finish_reason === "tool_calls" &&
					Array.isArray(choice.message.tool_calls) &&
					choice.message.tool_calls.length > 0
				) {
					for (const call of choice.message.tool_calls) {
						// Check if this is a function call (not a custom tool call)
						if (call.type !== "function") {
							continue;
						}
						// Defensive normalization
						const callId = typeof call.id === "string" ? call.id : String(call.id);
						const fname = call.function?.name;
						const fargsStr =
							typeof call.function?.arguments === "string"
								? call.function?.arguments
								: JSON.stringify(call.function?.arguments ?? {});
						console.groupCollapsed(`Tool Call: ${fname}`);
						console.log("Input:", fargsStr);

						if (!fname) {
							// Push a tool-role message indicating a malformed call
							input.push({
								role: "tool",
								tool_call_id: callId,
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
								tool_call_id: callId,
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
							// Parse arguments using the Zod schema
							const schema = zod.object(tooldefinition.schema as any);
							const parsedArgs = schema.parse(toolinput);

							const callResult = await tooldefinition.call(parsedArgs);
							const toolresStr =
								typeof callResult === "string" ? callResult : JSON.stringify(callResult);

							// Attach the tool output to the last result.content entry
							const lastIdx2 = result.content.length - 1;
							if (lastIdx2 >= 0 && (result.content[lastIdx2] as any).type === "tool") {
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
								tool_call_id: callId,
								content: toolresStr,
							});
							console.log("Output:", toolresStr);
							console.groupEnd();
						} catch (err) {
							console.error(`Error executing tool ${fname}:`, err);
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
							if (lastIdx >= 0 && (result.content[lastIdx] as any).type === "tool") {
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
								tool_call_id: callId,
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
