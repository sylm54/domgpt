import { useNavigate } from "react-router-dom";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import type { HypnoFile } from "@/types/user";
import { SessionGenerator } from "../components/hypno";

export function HypnoNewPage() {
	const { settings } = useSettingsStore();
	const navigate = useNavigate();

	const handleSessionGenerated = (session: HypnoFile) => {
		// Navigate to play the new session
		navigate(`/hypno/play/${session.id}`);
	};

	const model = getLLMModel(settings.llm_engine, settings.main_model);

	return (
		<div className="h-full p-4">
			<SessionGenerator model={model} onSessionGenerated={handleSessionGenerated} />
		</div>
	);
}
