// We handle Profile via a store so we can access it synchronously

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelDefinition, UserProfile } from "@/types/user";

export const modeldefs: ModelDefinition[] = [
	{
		id: "deepseek/deepseek-v3.2",
		name: "DeepSeek 3.2",
		description: "A powerful model for various tasks.",
		in_cost: 0.25,
		out_cost: 0.25,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "x-ai/grok-4.1-fast",
		name: "Grok 4.1 Fast",
		description: "Starting at $0.20/M input tokens, $0.50/M output tokens",
		in_cost: 0.2,
		out_cost: 0.5,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "stepfun/step-3.5-flash",
		name: "StepFun: Step 3.5 Flash",
		description:
			"Step 3.5 Flash is StepFun's most capable open-source foundation model. Built on a sparse Mixture of Experts (MoE) architecture, it selectively activates only 11B of its 196B parameters per token. It is a reasoning model that is incredibly speed efficient even at long contexts.",
		in_cost: 0.1,
		out_cost: 0.3,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "xiaomi/mimo-v2-flash",
		name: "MiMo-V2-Flash",
		description: "MiMo-V2-Flash is an open-source foundation language model developed by Xiaomi.",
		in_cost: 0.09,
		out_cost: 0.29,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "nousresearch/hermes-4-70b",
		name: "Nous: Hermes 4 70B",
		description:
			"Hermes 4 70B is a hybrid reasoning model from Nous Research, built on Meta-Llama-3.1-70B.",
		in_cost: 0.11,
		out_cost: 0.38,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "stepfun/step-3.5-flash:free",
		name: "StepFun: Step 3.5 Flash (free)",
		description:
			"Step 3.5 Flash is StepFun's most capable open-source foundation model. Built on a sparse Mixture of Experts (MoE) architecture, it selectively activates only 11B of its 196B parameters per token. It is a reasoning model that is incredibly speed efficient even at long contexts.",
		in_cost: 0,
		out_cost: 0,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
	{
		id: "nvidia/nemotron-3-nano-30b-a3b:free",
		name: "NVIDIA: Nemotron 3 Nano 30B A3B (free)",
		description:
			"NVIDIA Nemotron 3 Nano 30B A3B is a small language MoE model with highest compute efficiency and accuracy for developers to build specialized agentic AI systems.",
		in_cost: 0,
		out_cost: 0,
		stats: {
			cost: 0,
			quality: 0,
			speed: 0,
		},
	},
];

interface Profile {
	profile: UserProfile | undefined;
	setProfile: (profile: UserProfile) => void;
	updateProfile: (updates: Partial<UserProfile>) => void;
	updatePlan: (
		feature: "hypno" | "challenges" | "user" | "interview" | "coach",
		content: string
	) => void;
	getProfile: () => UserProfile | undefined;
}

export const useProfileStore = create<Profile>()(
	persist(
		(set, get) => ({
			profile: undefined,
			setProfile: (profile) => set({ profile }),
			updateProfile: (updates) =>
				set((state) => ({
					profile: state.profile ? { ...state.profile, ...updates } : undefined,
				})),
			updatePlan: (feature: "hypno" | "challenges" | "user" | "interview", content: string) =>
				set((state) => {
					if (!state.profile) return state;
					const updatedPlans = { ...state.profile.plan, [feature]: content };
					return {
						profile: { ...state.profile, plan: updatedPlans },
					};
				}),
			getProfile: () => get().profile,
		}),
		{
			name: "profile-storage",
			partialize: (state) => ({
				profile: state.profile,
			}),
		}
	)
);
