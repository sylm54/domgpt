import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { CoachChat } from "../components/steering";

export function CoachPage() {
	const { settings } = useSettingsStore();
	const navigate = useNavigate();
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");
	return (
		<div className="h-full flex flex-col p-4">
			<div className="flex items-center gap-2 mb-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>
			<div className="flex-1 min-h-0">
				<CoachChat model={model} />
			</div>
		</div>
	);
}
