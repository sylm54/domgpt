import type { ChatMessage, Model, Tool } from "./models";

/**
 * AgentContext holds the conversation state and provides
 * a subscription mechanism for UI updates.
 */
export type AgentContext = {
	conversation: ChatMessage[];
	system: ChatMessage[];
	in_progress: ChatMessage | undefined;
	listen: (callback: (ctx: AgentContext) => void) => () => void;
	_notify: () => void;
};

export class Agent {
	model: Model;
	context: AgentContext;
	private listeners: Set<(ctx: AgentContext) => void> = new Set();

	constructor(model: Model, systemPrompt?: string) {
		this.model = model;
		this.context = {
			conversation: [],
			system: systemPrompt
				? [{ type: "system", content: [{ type: "text", text: systemPrompt }] }]
				: [],
			in_progress: undefined,
			listen: (callback: (ctx: AgentContext) => void) => {
				this.listeners.add(callback);
				return () => this.listeners.delete(callback);
			},
			_notify: () => {
				for (const listener of this.listeners) {
					listener(this.context);
				}
			},
		};
	}

	/**
	 * Add a message from the agent (assistant) side to the conversation.
	 */
	addAgentMessage(message: string): void {
		const agentMsg: ChatMessage = {
			type: "assistant",
			content: [{ type: "text", text: message }],
		};
		this.context.conversation.push(agentMsg);
		this.context._notify();
	}

	/**
	 * Add a user message to the conversation and get a response.
	 * This is the simplest interaction pattern.
	 */
	async chat(message: string): Promise<ChatMessage> {
		const userMsg: ChatMessage = {
			type: "user",
			content: [{ type: "text", text: message }],
		};
		this.context.conversation.push(userMsg);
		this.context._notify();

		const response = await this.model.generate([
			...this.context.system,
			...this.context.conversation,
		]);

		this.context.conversation.push(response);
		this.context._notify();
		return response;
	}

	/**
	 * Perform an action with tool calling capabilities.
	 * This allows the agent to use tools to accomplish tasks.
	 */
	async act(
		message: ChatMessage,
		tools?: Tool[],
		onProgress?: (msg: ChatMessage) => void
	): Promise<ChatMessage> {
		// Add user message to conversation
		this.context.conversation.push(message);
		this.context._notify();

		// Create in-progress message
		const inProgress: ChatMessage = {
			type: "assistant",
			content: [],
		};
		this.context.in_progress = inProgress;
		this.context._notify();

		try {
			const allMessages = [...this.context.system, ...this.context.conversation];

			const response = await this.model.act(allMessages, tools ?? [], undefined, (intermediate) => {
				this.context.in_progress = intermediate;
				this.context._notify();
				onProgress?.(intermediate);
			});

			// Clear in-progress and add final response
			this.context.in_progress = undefined;
			this.context.conversation.push(response);
			this.context._notify();

			return response;
		} catch (error) {
			this.context.in_progress = undefined;
			this.context._notify();
			throw error;
		}
	}

	/**
	 * Clear the conversation history while keeping system messages.
	 */
	clearConversation(): void {
		this.context.conversation = [];
		this.context._notify();
	}

	/**
	 * Set a new system prompt, replacing any existing system messages.
	 */
	setSystemPrompt(prompt: string): void {
		this.context.system = [{ type: "system", content: [{ type: "text", text: prompt }] }];
		this.context._notify();
	}

	/**
	 * Get the full conversation history including system messages.
	 */
	getFullContext(): ChatMessage[] {
		return [...this.context.system, ...this.context.conversation];
	}
}
