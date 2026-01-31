import { useEffect, useState } from "react";
import { ChallengeAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { userMessage } from "../../lib/models";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { Challenge } from "@/types/user";
import { useSaveChallenge } from "@/data/challenges";
import { getChallengePlannerPrompt } from "@/prompts/challenge";
import { useProfileStore } from "@/data/profile";

interface ChallengeGeneratorProps {
	model: Model;
	onChallengesGenerated?: (challenges: Challenge[]) => void;
}

type GenerationPhase = "idle" | "generating" | "complete" | "error";

export function ChallengeGenerator({ model, onChallengesGenerated }: ChallengeGeneratorProps) {
	const [agent, setAgent] = useState<ChallengeAgent | null>(null);
	const [phase, setPhase] = useState<GenerationPhase>("idle");
	const [generatedChallenges, setGeneratedChallenges] = useState<Challenge[]>([]);

	const [error, setError] = useState<string | null>(null);
	const { profile } = useProfileStore();
	const saveChallenge = useSaveChallenge();

	useEffect(() => {
		setAgent(new ChallengeAgent(model));
	}, [model]);

	const generateChallenges = async () => {
		if (!agent || !profile) {
			setError("Agent not initialized or profile not available");
			setPhase("error");
			return;
		}

		setPhase("generating");
		setError(null);
		setGeneratedChallenges([]);

		try {
			// Set the system prompt with user profile and goal
			agent.setSystemPrompt(getChallengePlannerPrompt(profile));

			// Generate challenges
			const response = await agent.act(
				userMessage("Generate 5-8 challenges based on the user profile and goal.")
			);

			// Extract JSON from response
			const responseText = response.content
				.filter((c) => c.type === "text")
				.map((c) => c.text)
				.join("");

			// Try to parse JSON - look for JSON object in the response
			let challengesData: { challenges: string[] } | null = null;
			try {
				// Try to find JSON in the response (might be wrapped in markdown)
				const jsonMatch = responseText.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					challengesData = JSON.parse(jsonMatch[0]);
				} else {
					challengesData = JSON.parse(responseText);
				}
			} catch (parseError) {
				throw new Error(
					`Failed to parse challenge data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`
				);
			}

			if (!challengesData || !Array.isArray(challengesData.challenges)) {
				throw new Error("Invalid challenge data format: expected challenges array");
			}

			// Create Challenge objects and save them
			const challenges: Challenge[] = [];
			for (const description of challengesData.challenges) {
				if (typeof description === "string" && description.trim()) {
					const challenge: Challenge = {
						description: description.trim(),
						completed: false,
						created_at: new Date(),
					};
					const savedChallenge = await saveChallenge(challenge);
					challenges.push(savedChallenge);
				}
			}

			if (challenges.length === 0) {
				throw new Error("No valid challenges were generated");
			}

			setGeneratedChallenges(challenges);
			setPhase("complete");
			onChallengesGenerated?.(challenges);
		} catch (err) {
			const errmsg = err instanceof Error ? err.message : "Unknown error occurred";
			setError(errmsg);
			setPhase("error");
		} finally {
		}
	};

	const renderPhaseContent = () => {
		switch (phase) {
			case "generating":
				return (
					<div className="flex flex-col items-center justify-center space-y-4 py-8">
						<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
						<p className="text-muted-foreground">Generating challenges...</p>
						<p className="text-xs text-muted-foreground">
							Creating personalized micro-tasks based on your goals
						</p>
					</div>
				);
			case "complete":
				return (
					<div className="space-y-6">
						<div className="flex items-center gap-2 text-green-600">
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="Check mark"
							>
								<title>Check mark</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span className="font-medium text-lg">
								{generatedChallenges.length} challenges generated successfully!
							</span>
						</div>
						<div className="bg-muted p-4 rounded-lg">
							<h4 className="font-medium mb-3">New Challenges:</h4>
							<div className="space-y-2">
								{generatedChallenges.map((challenge, index) => (
									<div
										key={String(challenge.id?.id || index)}
										className="p-2 bg-background rounded"
									>
										<div className="flex items-start gap-2">
											<span className="text-sm text-muted-foreground mt-0.5">{index + 1}.</span>
											<span className="text-sm">{challenge.description}</span>
										</div>
									</div>
								))}
							</div>
						</div>
						<Button onClick={() => setPhase("idle")} variant="outline" className="w-full">
							Generate More Challenges
						</Button>
					</div>
				);
			case "error":
				return (
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-red-600">
							<svg
								className="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-label="Error"
							>
								<title>Error</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							<span className="font-medium">Error generating challenges</span>
						</div>
						<p className="text-sm text-muted-foreground">{error}</p>
						<Button onClick={() => setPhase("idle")} variant="outline" className="w-full">
							Try Again
						</Button>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<Card className="max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
			<CardHeader>
				<CardTitle>Generate Challenges</CardTitle>
				<CardDescription>
					Create personalized daily challenges to practice your conditioning goals in real life
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 flex-1 overflow-y-auto">
				{phase === "idle" && (
					<Button onClick={generateChallenges} className="w-full">
						Generate Challenges
					</Button>
				)}

				{phase !== "idle" && renderPhaseContent()}
			</CardContent>
		</Card>
	);
}
