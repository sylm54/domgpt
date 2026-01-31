import { getLLMModel, useSettingsStore } from "@/data/settings";
import { CoachChat } from "../components/steering";

export function CoachPage() {
	const { settings } = useSettingsStore();
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");
	return (
		<div className="h-full p-4">
			<CoachChat model={model} />
		</div>
	);
}
