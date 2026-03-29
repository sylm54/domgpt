//We handle Settings via a store so we can access them synchronously

import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createTauriFetcher } from "@/lib/http";
import type { Model } from "@/lib/models";
import { OpenRouterModel } from "@/lib/models/openrouter";
import type { AppSettings, LLMEngine, LLMModel } from "@/types/user";
import OpenAI from "openai";
import { NanoGPTModel } from "@/lib/models/nanogpt";

type ModelInfo = {
	ids: Record<string, string>; // Provider:ModelID e.g. {"provider":"modelID"}
	name: string;
	description: string;
};

export const models: ModelInfo[] = [
	{
		ids: {
			nanoGPT: "stepfun-ai/step-3.5-flash:thinking",
		},
		name: "StepFun 3.5 Flash (Thinking)",
		description: "A model fine-tuned for creative writing and content generation.",
	},
	{
		ids: {
			nanoGPT: "nousresearch/hermes-3-llama-3.1-70b",
		},
		name: "Hermes 3 (LLaMA 3.1 70B)",
		description:
			"A large language model based on LLaMA 3.1 architecture, optimized for a wide range of tasks with enhanced reasoning capabilities.",
	},
	{
		ids: {
			openrouter: "x-ai/grok-4.1-fast",
		},
		name: "Grok 4.1 Fast (Speedy)",
		description: "A fast and efficient model for speedy responses.",
	},
	{
		ids: {
			nanoGPT: "deepseek/deepseek-v3.2-speciale",
		},
		name: "DeepSeek v3.2 Speciale",
		description: "Speciale version of DeepSeek v3.2 with unique optimizations for creative tasks.",
	},
	{
		ids: {
			openrouter: "deepseek/deepseek-v3.2-exp",
		},
		name: "DeepSeek v3.2 Experimental",
		description: "Experimental version of DeepSeek v3.2.",
	},
	{
		ids: {
			openrouter: "deepseek/deepseek-v3.2",
			nanoGPT: "deepseek/deepseek-v3.2:thinking",
		},
		name: "DeepSeek v3.2",
		description: "Stable release of DeepSeek v3.2.",
	},
	{
		ids: {
			openrouter: "stepfun/step-3.5-flash:free",
		},
		name: "Step 3.5 Flash (Free)",
		description: "A free, fast model for quick and efficient content generation.",
	},
	{
		ids: {
			nanoGPT: "GLM-4.6-Derestricted-v5",
		},
		name: "GLM 4.6 Derestricted v5",
		description:
			"Derestricted GLM 4.6 tuned for open-ended creative writing and roleplay with relaxed filters.",
	},
	{
		ids: {
			nanoGPT: "mistralai/mistral-large-3-675b-instruct-2512",
		},
		name: "Mistral Large 3 Instruct",
		description:
			"Mistral Large 3 675B is Mistral AI's flagship language model featuring advanced rope scaling and Eagle speculative decoding.",
	},
];

interface Settings {
	settings: AppSettings;
	updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<Settings>()(
	persist(
		(set, get) => ({
			settings: {
				llm_engines: [],
			},
			updateSettings: (settings) =>
				set((state) => ({ settings: { ...state.settings, ...settings } })),
		}),
		{
			name: "settings-storage",
			partialize: (state) => ({
				settings: state.settings,
			}),
		}
	)
);

export function useModel() {
	const { settings } = useSettingsStore();
	const model = useMemo(
		() => getLLMModel(settings.llm_engines, settings.main_model),
		[settings.main_model, settings.llm_engines]
	);
	return model;
}

export function getLLMModel(engines: LLMEngine[], model: LLMModel): Model {
	if (!engines) {
		throw new Error("LLM engines not configured. Please complete the model configuration step.");
	}
	if (!model) {
		throw new Error("Model not configured. Please complete the model configuration step.");
	}
	const engine = engines.filter((e) => e.type === model.engine)[0];
	if (!engine) {
		throw new Error(`Engine ${model.engine} not found in settings`);
	}
	switch (engine.type) {
		case "nanoGPT": {
			const provider = new OpenAI({
				apiKey: engine.api_key,
				baseURL: "https://nano-gpt.com/api/subscription/v1",
				dangerouslyAllowBrowser: true,
			});
			const openRouterModel = new NanoGPTModel(provider, model.model);
			return openRouterModel;
		}
		case "openrouter": {
			const httpClient = new HTTPClient({
				fetcher: createTauriFetcher(),
			});
			const router = new OpenRouter({
				httpClient,
				apiKey: engine.api_key,
			});
			const openRouterModel = new OpenRouterModel(router, model.model);
			return openRouterModel;
		}
	}
}
