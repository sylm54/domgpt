import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useSaveChallenge } from "@/data/challenges";
import { useProfileStore } from "@/data/profile";
import { cn } from "@/lib/utils";
import { getChallengePlannerPrompt } from "@/prompts/challenge";
import type { Challenge } from "@/types/user";
import { ChallengeAgent } from "../../lib/agent";
import type { Model } from "../../lib/models";
import { userMessage } from "../../lib/models";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

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
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="flex flex-col items-center justify-center space-y-6 py-12"
					>
						{/* Animated Loading Rings */}
						<div className="relative w-20 h-20">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
								className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 border-r-pink-500/50"
							/>
							<motion.div
								animate={{ rotate: -360 }}
								transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
								className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-500/50"
							/>
							<motion.div
								animate={{ scale: [1, 1.2, 1] }}
								transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
								className="absolute inset-0 flex items-center justify-center"
							>
								<div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-lg shadow-pink-500/50" />
							</motion.div>
						</div>

						{/* Loading Text */}
						<div className="text-center space-y-2">
							<motion.p
								animate={{ opacity: [0.5, 1, 0.5] }}
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
								className="text-lg font-medium bg-gradient-to-r from-pink-600 to-fuchsia-600 bg-clip-text text-transparent"
							>
								Generating challenges...
							</motion.p>
							<p className="text-sm text-muted-foreground max-w-xs">
								Creating personalized micro-tasks based on your goals
							</p>
						</div>

						{/* Animated Dots */}
						<div className="flex gap-1.5">
							{[0, 1, 2].map((i) => (
								<motion.div
									key={i}
									animate={{ y: [0, -8, 0] }}
									transition={{
										duration: 0.6,
										repeat: Number.POSITIVE_INFINITY,
										delay: i * 0.15,
									}}
									className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-500"
								/>
							))}
						</div>
					</motion.div>
				);
			case "complete":
				return (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="space-y-6"
					>
						{/* Success Header */}
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 200, damping: 15 }}
							className="flex items-center justify-center"
						>
							<div className="relative">
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: [0, 1.2, 1] }}
									transition={{ duration: 0.5 }}
									className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-green-500/30"
								>
									<motion.svg
										initial={{ pathLength: 0 }}
										animate={{ pathLength: 1 }}
										transition={{ duration: 0.5, delay: 0.2 }}
										className="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<motion.path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={3}
											d="M5 13l4 4L19 7"
										/>
									</motion.svg>
								</motion.div>
								{/* Celebration Particles */}
								{["p1", "p2", "p3", "p4", "p5", "p6"].map((id, i) => (
									<motion.div
										key={id}
										initial={{ scale: 0, x: 0, y: 0 }}
										animate={{
											scale: [0, 1, 0],
											x: Math.cos((i * 60 * Math.PI) / 180) * 40,
											y: Math.sin((i * 60 * Math.PI) / 180) * 40,
										}}
										transition={{ duration: 0.6, delay: 0.3 }}
										className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-fuchsia-400"
									/>
								))}
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="text-center"
						>
							<p className="text-xl font-semibold text-green-600 dark:text-green-400">
								{generatedChallenges.length} challenges generated!
							</p>
							<p className="text-sm text-muted-foreground mt-1">Ready to start your journey</p>
						</motion.div>

						{/* Challenge List */}
						<div className="bg-gradient-to-br from-muted/50 to-muted rounded-xl p-4 border border-border/50">
							<h4 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
								New Challenges
							</h4>
							<div className="space-y-2">
								{generatedChallenges.map((challenge, index) => (
									<motion.div
										key={String(challenge.id?.id || index)}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.4 + index * 0.1 }}
										className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50 hover:border-pink-500/30 transition-colors"
									>
										{/* Number Badge */}
										<div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-pink-500/20">
											{index + 1}
										</div>
										<p className="text-sm leading-relaxed pt-0.5">{challenge.description}</p>
									</motion.div>
								))}
							</div>
						</div>

						<Button
							onClick={() => setPhase("idle")}
							variant="outline"
							className="w-full border-pink-500/30 hover:border-pink-500/50 hover:bg-pink-500/5"
						>
							Generate More Challenges
						</Button>
					</motion.div>
				);
			case "error":
				return (
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="space-y-4"
					>
						{/* Error Icon */}
						<div className="flex justify-center">
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ type: "spring", stiffness: 200 }}
								className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30"
							>
								<svg
									className="w-7 h-7 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2.5}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</motion.div>
						</div>

						<div className="text-center">
							<p className="font-semibold text-red-600 dark:text-red-400">
								Error generating challenges
							</p>
						</div>

						{/* Error Message Box */}
						<div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
							<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						</div>

						<Button
							onClick={() => setPhase("idle")}
							variant="outline"
							className="w-full border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5"
						>
							Try Again
						</Button>
					</motion.div>
				);
			default:
				return null;
		}
	};

	return (
		<Card className="max-h-[calc(100vh-200px)] overflow-hidden flex flex-col relative border-pink-500/20 shadow-xl shadow-pink-500/5">
			{/* Gradient Accent Line */}
			<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500" />

			{/* Corner Decoration */}
			<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-500/10 to-transparent pointer-events-none" />

			<CardHeader className="relative">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
						<svg
							className="w-5 h-5 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
					</div>
					<div>
						<CardTitle className="text-xl">Generate Challenges</CardTitle>
						<CardDescription className="mt-1">
							Create personalized daily challenges to practice your conditioning goals
						</CardDescription>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6 flex-1 overflow-y-auto">
				<AnimatePresence mode="wait">
					{phase === "idle" && (
						<motion.div
							key="idle"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="space-y-4"
						>
							{/* Info Box */}
							<div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5 border border-pink-500/10">
								<div className="flex gap-3">
									<div className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
										<svg
											className="w-4 h-4 text-pink-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											AI will generate 5-8 personalized micro-challenges based on your profile and
											conditioning goals.
										</p>
									</div>
								</div>
							</div>

							{/* Generate Button */}
							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
								<Button
									onClick={generateChallenges}
									className={cn(
										"w-full h-12 text-base font-semibold relative overflow-hidden",
										"bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500",
										"hover:from-pink-600 hover:via-fuchsia-600 hover:to-purple-600",
										"shadow-lg shadow-pink-500/25 hover:shadow-xl hover:shadow-pink-500/30",
										"transition-all duration-300"
									)}
								>
									{/* Glow Effect */}
									<div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
									<span className="relative flex items-center gap-2">
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13 10V3L4 14h7v7l9-11h-7z"
											/>
										</svg>
										Generate Challenges
									</span>
								</Button>
							</motion.div>
						</motion.div>
					)}

					{phase !== "idle" && <motion.div key={phase}>{renderPhaseContent()}</motion.div>}
				</AnimatePresence>
			</CardContent>
		</Card>
	);
}
