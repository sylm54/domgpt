//We handle Settings via a store so we can access them synchronously

import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OpenRouterModel } from "@/lib/models/openrouter";
import type { AppSettings, LLMEngine } from "@/types/user";
import type { Model } from "@/lib/models";
import { createTauriFetcher } from "@/lib/http";

interface Settings {
	settings: AppSettings;
	updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<Settings>()(
	persist(
		(set, get) => ({
			settings: {
				processing_mode: "local",
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
	return getLLMModel(settings.llm_engine, settings.main_model);
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
