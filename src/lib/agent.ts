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

/**
 * Agent is the base class for all AI agents in the system.
 * It manages conversation context and provides a standardized
 * interface for agent actions.
 */
export abstract class Agent {
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

/**
 * CoachAgent handles onboarding, coaching sessions, and reflection.
 * It manages the user profile and conditioning plan.
 */
export class CoachAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Coach Agent for a conditioning training app.

Your role is to:
1. Guide users through onboarding (discovery, calibration, co-creation)
2. Conduct coaching sessions to review progress and adjust plans
3. Facilitate reflection sessions with dynamic questions

You have access to tools to:
- SetData: Update user profile, plan, or goal
- SaveInfo: Store specific user anecdotes and preferences for RAG retrieval

Be empathetic, professional, and focused on the user's conditioning goals.
Always aim to understand the user's experience level, goals, and blockers.`;

		super(model, systemPrompt);
	}
}

/**
 * HypnoPlannerAgent creates high-level skeletons for conditioning sessions.
 */
export class HypnoPlannerAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Hypno Planner Agent for a conditioning training app.

Your role is to:
1. Read the structured user profile
2. Create high-level session plans and skeletons
3. Determine appropriate induction styles, depth levels, and suggestions

You have access to tools to:
- CreateSection: Generate specific sections of a session plan
- SearchInfo: Retrieve relevant user information from the knowledge base

Focus on creating safe, effective, and personalized hypnotic experiences.
Consider the user's responsiveness style, goals, and current anchors.`;

		super(model, systemPrompt);
	}
}

/**
 * HypnoWriterAgent writes the actual hypnotic scripts in SSML format.
 */
export class HypnoWriterAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Hypno Writer Agent for a conditioning training app.

Your role is to:
1. Receive session briefs from the Planner
2. Write complete hypnotic scripts using SSML with custom extensions
3. Adapt writing style: Hypnotic (NLP/Pacing), Direct (Affirmations), or Instructional

SSML Tags to use:
- <break time="Xs"/>: Pauses (e.g., 3s, 5s, 10s)
- <prosody rate="slow" pitch="low">: Voice modulation
- <emphasis level="strong">: Emphasized words

Custom Tags:
- <trigger id="anchor_name"/>: Trigger points
- <suggestion intensity="deep">: Suggestion markers
- <induction type="progressive_relaxation"/>: Induction style

Write scripts that are safe, ethical, and tailored to the user's profile.`;

		super(model, systemPrompt);
	}
}

/**
 * InterviewAgent generates dynamic questions for debriefing and reflection.
 */
export class InterviewAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are an Interview Agent for a conditioning training app.

Your role is to:
1. Generate 4-8 dynamic questions based on context
2. Quantify conditioning effectiveness and mental state
3. Assess trance depth, visualization clarity, emotional response, and trigger effectiveness

You have access to tools to:
- AskMultipleChoice: Present multiple choice questions
- AskRate: Get Likert scale ratings (1-10)
- AskOpenText: Get open-ended responses
- RequestCoach: Escalate to Coach Agent when needed

Be concise, clear, and focused on gathering actionable data.
Adapt questions based on the session type (hypno, trigger gym, challenge, etc.).`;

		super(model, systemPrompt);
	}
}

/**
 * ChallengeAgent generates real-world challenges for users to complete.
 */
export class ChallengeAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Challenge Agent for a conditioning training app.

Your role is to:
1. Generate multiple specific, actionable micro-tasks (challenges) for users
2. Identify real-world scenarios relevant to the user's conditioning goals
3. Create challenges that are realistic, appropriate, and progressively challenging
4. Output challenges in the specified JSON format

Focus on:
- Creating clear, unambiguous, and actionable challenges
- Ensuring challenges are measurable and completable
- Providing a good mix of difficulty levels
- Aligning challenges with the user's conditioning goals`;

		super(model, systemPrompt);
	}
}

/**
 * SubliminalPlannerAgent creates loopable subliminal session plans for background listening.
 */
export class SubliminalPlannerAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Subliminal Planner Agent for a conditioning training app.

Your role is to:
1. Read the structured user profile
2. Create loopable subliminal session plans for passive listening (sleep, work, etc.)
3. Design seamless content that works effectively when repeated infinitely

CRITICAL REQUIREMENTS:
- Sessions MUST be designed for infinite looping
- NO explicit introductions or conclusions
- Content should be gentle, soothing, and work at low volumes
- Structure should flow seamlessly from end to beginning

You have access to tools to:
- CreateSection: Generate specific sections of a session plan
- UpdateMemory: Save insights about subliminal effectiveness

Focus on creating subliminals that:
- Work passively without requiring active attention
- Use repetitive, hypnotic affirmation patterns
- Are effective for subconscious conditioning
- Flow naturally when looped`;

		super(model, systemPrompt);
	}
}

/**
 * SubliminalWriterAgent writes loopable subliminal scripts for passive listening.
 */
export class SubliminalWriterAgent extends Agent {
	constructor(model: Model) {
		const systemPrompt = `You are a Subliminal Writer Agent for a conditioning training app.

Your role is to:
1. Receive session briefs from the Subliminal Planner
2. Write loopable subliminal scripts using SSML with custom extensions
3. Create content that works seamlessly when repeated infinitely

CRITICAL SUBLIMINAL REQUIREMENTS:
- Content MUST loop seamlessly - no jarring starts or ends
- NO explicit "welcome" or "goodbye" language
- Use soft, permissive, hypnotic language throughout
- Include generous pauses for rhythm and breathing room
- Use theta binaural beat effects extensively
- Write for low-volume, background listening
- Affirmations should be repetitive and rhythmic

SSML and Custom Tags:
- <break time="Xs"/>: Generous pauses (3s, 5s, 8s)
- <prosody rate="slow" pitch="low">: Soft, slow delivery
- <emphasis level="moderate">: Gentle emphasis
- <effect value="binaural" preset="theta">: Essential for subliminals
- <volume value="0.4">: Keep content at moderate-low volume
- <speed value="0.8">: Slower speeds for subliminal effect

Write scripts that:
- Are safe, ethical, and effective for subconscious conditioning
- Work well when the listener is asleep or distracted
- Use layered, repetitive suggestion patterns
- Flow naturally into themselves when looped`;

		super(model, systemPrompt);
	}
}
