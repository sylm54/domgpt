import type { RecordId } from "surrealdb";

interface HistoryData {
	[x: string]: unknown;
	id?: RecordId;
	type: string;
	time: Date;
}

export type HistoryItem = HistorySession | HistoryReflection;

export interface HistorySession extends HistoryData {
	type: "session";
	session_type: SessionType;
	data: RecordId;
	extra?: string;
	debrief?: Reflection;
}

export interface HistoryReflection extends HistoryData {
	type: "reflection";
	reflection: Reflection;
}

export type UserProfile = {
	profile: string;
	goal: string;
	plan: ConditioningPlan;
	created_at: Date;
};

export type ConditioningPlan = {
	hypno: string;
	challenges: string;
	user: string;
	coach: string;
	interview: string;
};

export type UserInfo = {
	id?: RecordId;
	content: string;
	tags: string[];
	created_at: Date;
	embedding?: number[];
};

export type LLMEngine = {
	type: "openrouter";
	api_key?: string;
};

export type TTSEngine = {
	type: "inbuild";
};

export type CoachTrait =
	| "soft" // Gentle and non-confrontational
	| "motivational" // Inspires and uplifts the user
	| "encouraging" // More friendly and supportive
	| "empathetic" // Shows understanding of user's feelings
	| "direct" // Straightforward and to the point
	| "informative" // Provides detailed explanations
	| "intense" // More forceful and goes farther
	| "pushing" // Expands on the users goals and takes them further
	| "assertive"; // Act without the users knowledge / doesnt tell the user what exactly it is doing

export type HypnoStyle = "authoritarian" | "permissive" | "balanced";

export type InductionType = "progressive_relaxation" | "visualization" | "breathing";

export type SensoryType = "visual" | "kinesthetic" | "mixed";

export type SuggestionType = "direct" | "indirect" | "permissive";

export type HypnoStyleConfig = {
	style: HypnoStyle;
	induction_types: InductionType[];
	sensory: SensoryType;
	suggestion: SuggestionType;
};

export type AppSettings = {
	llm_engine?: LLMEngine;
	main_model?: string;
	tts_engine?: TTSEngine;
	coach_traits?: CoachTrait[];
	hypno_style?: HypnoStyleConfig;
};

export type SessionType = "hypno" | "trigger_gym" | "challenge" | "habit" | "mantra" | "subliminal";

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

export type ThoughtAnalysis = {
	thought: string;
	is_conducive: boolean;
	reframed?: string;
};

export type ReflectionSummary = {
	conducive_thoughts: string[];
	not_conducive_thoughts: string[];
	key_insights: string;
	conversation_summary: string;
};

// Legacy reflection format with questionnaire
export type LegacyReflection = {
	questions: Question[];
	created_at: string;
};

// New socratic reflection format
export type SocraticReflection = {
	conversation: {
		role: "user" | "assistant";
		content: string;
	}[];
	thought_analysis: ThoughtAnalysis[];
	summary: ReflectionSummary;
	created_at: string;
};

// Combined reflection type
export type Reflection = LegacyReflection | SocraticReflection;

// Type guards
export function isLegacyReflection(reflection: Reflection): reflection is LegacyReflection {
	return "questions" in reflection;
}

export function isSocraticReflection(reflection: Reflection): reflection is SocraticReflection {
	return "conversation" in reflection;
}

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
	description: string;
	completed: boolean;
	created_at: Date;
	completed_at?: Date;
};
