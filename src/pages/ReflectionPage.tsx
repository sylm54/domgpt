import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { ReflectionSession } from "../components/steering";

export function ReflectionPage() {
	const { settings } = useSettingsStore();
	const navigate = useNavigate();
	const model = settings.main_model ? getLLMModel(settings.llm_engines, settings.main_model) : null;
	return (
		<div className="relative h-full overflow-hidden bg-background">
			{/* Content container */}
			<div className="relative h-full p-6 md:p-8 lg:p-10">
				{/* Back button */}
				<div className="mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
				<div className="mx-auto max-w-2xl h-[calc(100%-3rem)]">
					<ReflectionSession model={model} />
				</div>
			</div>
		</div>
	);
}
