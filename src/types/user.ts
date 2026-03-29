import type { RecordId } from "surrealdb";
import * as z from "zod";

interface HistoryData {
	[x: string]: unknown;
	id?: RecordId;
	type: string;
	time: Date;
}

export type Question =
	| {
			question: string;
			answer: string;
			type: "multiple_choice";
			options: string[];
	  }
	| {
			question: string;
			type: "rating";
			scale: number;
			answer: number;
	  }
	| {
			question: string;
			type: "open_text";
			answer: string;
	  };

export type HistoryItem = HypnoSession | ChallengeSession | ReflectionSession;

export interface HypnoSession extends HistoryData {
	type: "session_hypno";
	extra?: string;
	debrief: Question[];
}

export interface ChallengeSession extends HistoryData {
	type: "challenge_session";
	user_report: string;
}

export interface ReflectionSession extends HistoryData {
	type: "reflection_session";
	report: string;
	chat: {
		role: "user" | "assistant";
		content: string;
	}[];
}

export const UserDataSchema = z.object({
	profile: z.object({
		environment: z.string(),
		habits: z.array(z.string()),
		strengths: z.array(z.string()),
		weaknesses: z.array(z.string()),
		identity: z.string(),
		constraints: z.array(z.string()),
		resources: z.array(
			z.object({ name: z.string(), description: z.string(), tags: z.array(z.string()) })
		),
		currentMilestone: z.number(),
	}),
	goal: z.object({
		description: z.string(),
		motivation: z.string(),
		targetIdentity: z.string(),
	}),
	todos: z.record(
		z.string(),
		z.object({
			title: z.string(),
			content: z.string(),
			weekdays: z.array(z.number()).optional(),
		})
	),
	plan: z.object({
		hypno: z.string(),
		challenges: z.string(),
		interview: z.string(),
	}),
	milestones: z.array(
		z.object({
			title: z.string(),
			description: z.string(),
		})
	),
	// derived fields
	currentMilestone: z
		.object({
			title: z.string(),
			description: z.string(),
		})
		.describe(
			"Current milestone derived from profile.currentMilestone index and milestones array [READ ONLY]"
		),
	currentResourceTags: z
		.array(z.string())
		.describe("List of Tags currently used in profile.resources, used for retrieval [READ ONLY]"),
});

export type UserData = z.infer<typeof UserDataSchema>;

export const isDebugMode = true;

export type UserProfile = {
	data: UserData;
	personality: {
		coach: string;
		reflection: string;
		hypnostyle: string;
	};
	created_at: Date;
	updated_at: Date;
};

export type LLMEngine =
	| {
			type: "openrouter";
			api_key?: string;
	  }
	| {
			type: "nanoGPT";
			api_key?: string;
	  };

export type TTSEngine = {
	type: "inbuild";
};

export type LLMModel = {
	engine: LLMEngine extends { type: infer T } ? T : never;
	model: string;
};

export type AppSettings = {
	llm_engines: LLMEngine[];
	main_model?: LLMModel;
	tts_engine?: TTSEngine;
};

export type HypnoPlan = {
	name: string;
	content: string;
}[];

export type HypnoFile = {
	id?: RecordId;
	hypno_file: string;
	plan: HypnoPlan;
	script: string;
	duration_seconds: number;
	created_at: Date;
};

export type SubliminalFile = {
	id?: RecordId;
	subliminal_file: string;
	plan: HypnoPlan;
	script: string;
	duration_seconds: number;
	created_at: Date;
};

export type Challenge = {
	id?: RecordId;
	title: string;
	completed: boolean;
	description: string;
	created_at: Date;
	completed_at?: Date;
};

export type TodoCompletion = {
	id?: RecordId;
	todo_id: string;
	date: string;
	completed: boolean;
	completed_at?: Date;
};

export type Todo = {
	id: string;
	title: string;
	content: string;
	weekdays?: number[];
	created_at?: Date;
	updated_at?: Date;
};

export type TodoWithStatus = Todo & {
	completed_today: boolean;
	completion_stats: {
		total_days: number;
		completed_days: number;
		completion_rate: number;
	};
};
