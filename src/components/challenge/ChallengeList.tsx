import { useState } from "react";
import { useActiveChallenges } from "@/data/challenges";
import { useCompleteChallenge } from "@/data/challenges";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { Challenge } from "@/types/user";

export function ChallengeList() {
	const challenges = useActiveChallenges();
	const completeChallenge = useCompleteChallenge();
	const [completingId, setCompletingId] = useState<string | null>(null);
	const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

	const getChallengeId = (challenge: Challenge): string => {
		return String(challenge.id?.id || "");
	};

	const handleComplete = async (challenge: Challenge) => {
		setCompletingId(getChallengeId(challenge));
		try {
			await completeChallenge(challenge);
			setCompletedIds((prev) => new Set(prev).add(getChallengeId(challenge)));
		} catch (error) {
			console.error("Failed to complete challenge:", error);
		} finally {
			setCompletingId(null);
		}
	};

	if (!challenges) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-muted-foreground">Loading challenges...</div>
			</div>
		);
	}

	if (challenges.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8">
				<div className="text-muted-foreground text-center">
					No active challenges. Generate new challenges to get started!
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold">Active Challenges ({challenges.length})</h2>
			{challenges.map((challenge) => {
				const id = getChallengeId(challenge);
				const isCompleting = completingId === id;
				const isCompleted = completedIds.has(id);
				return (
					<Card key={id} className={isCompleted ? "opacity-50" : ""}>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								{isCompleted && (
									<svg
										className="w-5 h-5 text-green-600"
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
								)}
								Challenge
							</CardTitle>
							<CardDescription>
								Created {new Date(challenge.created_at).toLocaleDateString()}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="p-4 bg-muted rounded-lg">
								<p className="text-base">{challenge.description}</p>
							</div>
							{!isCompleted && (
								<Button
									onClick={() => handleComplete(challenge)}
									disabled={isCompleting}
									className="w-full"
								>
									{isCompleting ? "Completing..." : "Mark as Complete"}
								</Button>
							)}
							{isCompleted && (
								<div className="text-sm text-green-600 font-medium text-center">
									✓ Challenge completed!
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
