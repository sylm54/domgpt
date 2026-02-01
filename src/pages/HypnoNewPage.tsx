import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
		<div className="h-full p-4 flex flex-col">
			<div className="flex items-center gap-2 mb-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>
			<SessionGenerator model={model} onSessionGenerated={handleSessionGenerated} />
		</div>
	);
}
