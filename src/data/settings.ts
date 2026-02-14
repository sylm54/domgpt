//We handle Settings via a store so we can access them synchronously

import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createTauriFetcher } from "@/lib/http";
import type { Model } from "@/lib/models";
import { OpenRouterModel } from "@/lib/models/openrouter";
import type { AppSettings, LLMEngine } from "@/types/user";

interface Settings {
	settings: AppSettings;
	updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<Settings>()(
	persist(
		(set, get) => ({
			settings: {
				processing_mode: "local",
				embedding_model: "openai/text-embedding-3-small",
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
		() => getLLMModel(settings.llm_engine, settings.main_model),
		[settings.main_model, settings.llm_engine]
	);
	return model;
}

export function useEmbeddingModel() {
	const { settings } = useSettingsStore();
	const model = useMemo(
		() =>
			getEmbeddingModel(
				settings.embedding_engine ?? settings.llm_engine,
				settings.embedding_model ?? "qwen/qwen3-embedding-8b"
			),
		[settings.embedding_model, settings.embedding_engine, settings.llm_engine]
	);
	return { model, modelName: settings.embedding_model ?? "qwen/qwen3-embedding-8b" };
}

export function getEmbeddingModel(
	engine: LLMEngine | undefined,
	model: string
): {
	openRouter: OpenRouter;
	modelName: string;
} {
	// if (!engine || engine.type !== "openrouter") {
	// 	throw new Error(`Unsupported embedding engine type: ${engine?.type ?? "undefined"}`);
	// }
	const httpClient = new HTTPClient({
		fetcher: createTauriFetcher(),
	});
	const router = new OpenRouter({
		httpClient,
		apiKey: engine.api_key,
	});
	return { openRouter: router, modelName: model };
}

export function getLLMModel(engine: LLMEngine, model: string): Model {
	if (engine.type !== "openrouter") throw new Error(`Unsupported LLM engine type: ${engine.type}`);
	const httpClient = new HTTPClient({
		fetcher: createTauriFetcher(),
	});
	const router = new OpenRouter({
		httpClient,
		apiKey: engine.api_key,
	});
	const openRouterModel = new OpenRouterModel(router, model);
	return openRouterModel;
}
