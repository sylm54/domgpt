import { HTTPClient, OpenRouter } from "@openrouter/sdk";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionPlayer } from "../components/hypno";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { createTauriFetcher } from "../lib/http";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { useHypnoFileById } from "@/data/hypno";

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
			<div className="h-full flex items-center justify-center p-4">
				<p>Loading session...</p>
			</div>
		);
	}

	if (hypno === null) {
		return (
			<div className="h-full flex items-center justify-center p-4">
				<Card>
					<CardContent className="p-6 text-center space-y-4">
						<p className="text-muted-foreground">Session not found.</p>
						<Button onClick={() => navigate("/")}>Go to Dashboard</Button>
					</CardContent>
				</Card>
			</div>
		);
	}
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");

	return (
		<div className="h-full p-4">
			<SessionPlayer session={hypno} model={model} onComplete={handleComplete} />
		</div>
	);
}
