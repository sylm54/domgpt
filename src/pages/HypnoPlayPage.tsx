import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useHypnoFileById } from "@/data/hypno";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { SessionPlayer } from "../components/hypno";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export function HypnoPlayPage() {
	const { sessionId } = useParams<{ sessionId: string }>();
	const { settings } = useSettingsStore();
	const hypno = useHypnoFileById(sessionId);
	const navigate = useNavigate();

	const handleComplete = () => {
		// Navigate back to dashboard after session completion
		navigate("/");
	};

	if (hypno === undefined) {
		return (
			<div className="h-full flex flex-col p-4">
				<div className="flex items-center gap-2 mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<p>Loading session...</p>
				</div>
			</div>
		);
	}

	if (hypno === null) {
		return (
			<div className="h-full flex flex-col p-4">
				<div className="flex items-center gap-2 mb-4">
					<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
						<ArrowLeft className="h-4 w-4 mr-1" />
						Back
					</Button>
				</div>
				<div className="flex-1 flex items-center justify-center">
					<Card>
						<CardContent className="p-6 text-center space-y-4">
							<p className="text-muted-foreground">Session not found.</p>
							<Button onClick={() => navigate("/")}>Go to Dashboard</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}
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
				<SessionPlayer session={hypno} model={model} onComplete={handleComplete} />
			</div>
		</div>
	);
}
