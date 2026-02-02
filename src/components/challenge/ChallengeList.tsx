import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useActiveChallenges, useCompleteChallenge } from "@/data/challenges";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/types/user";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface ChallengeListProps {
	refreshKey?: number;
}

export function ChallengeList({ refreshKey }: ChallengeListProps) {
	const { challenges, refetch } = useActiveChallenges();
	const completeChallenge = useCompleteChallenge();
	const [completingId, setCompletingId] = useState<string | null>(null);
	const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
	const [celebratingId, setCelebratingId] = useState<string | null>(null);

	// Refetch when refreshKey changes
	useEffect(() => {
		if (refreshKey !== undefined && refreshKey > 0) {
			refetch();
		}
	}, [refreshKey, refetch]);

	const getChallengeId = (challenge: Challenge): string => {
		return String(challenge.id?.id || "");
	};

	const handleComplete = async (challenge: Challenge) => {
		const id = getChallengeId(challenge);
		setCompletingId(id);
		try {
			await completeChallenge(challenge);
			setCelebratingId(id);
			// Short celebration before marking complete and refetching
			setTimeout(() => {
				setCompletedIds((prev) => new Set(prev).add(id));
				setCelebratingId(null);
				refetch();
			}, 1500);
		} catch (error) {
			console.error("Failed to complete challenge:", error);
		} finally {
			setCompletingId(null);
		}
	};

	if (!challenges) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="flex items-center justify-center py-12"
			>
				<div className="flex flex-col items-center gap-4">
					<div className="relative w-12 h-12">
						<motion.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
							className="absolute inset-0 rounded-full border-3 border-transparent border-t-pink-500"
						/>
					</div>
					<p className="text-muted-foreground">Loading challenges...</p>
				</div>
			</motion.div>
		);
	}

	if (challenges.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center justify-center py-16 px-4"
			>
				{/* Empty State Illustration */}
				<motion.div
					initial={{ scale: 0.8 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 200, damping: 15 }}
					className="mb-6"
				>
					<div className="w-24 h-24 rounded-full bg-pink-500/10 flex items-center justify-center">
						<motion.div
							animate={{ y: [0, -4, 0] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
						>
							<svg
								className="w-12 h-12 text-pink-500/60"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
						</motion.div>
					</div>
				</motion.div>

				<h3 className="text-lg font-semibold text-foreground mb-2">No Active Challenges</h3>
				<p className="text-muted-foreground text-center max-w-xs">
					Generate new challenges to start your conditioning journey!
				</p>

				{/* Decorative arrow pointing to generator */}
				<motion.div
					animate={{ x: [-5, 5, -5] }}
					transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
					className="mt-6 text-pink-500/50"
				>
					<svg
						className="w-6 h-6 rotate-180 lg:rotate-[-90deg]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						/>
					</svg>
				</motion.div>
			</motion.div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Section Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold">Active Challenges</h2>
					<motion.span
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						className="px-3 py-1 rounded-full bg-pink-500 text-white text-sm font-bold shadow-md shadow-pink-500/25"
					>
						{challenges.length}
					</motion.span>
				</div>
			</div>

			{/* Challenge Cards */}
			<div className="space-y-4">
				<AnimatePresence>
					{challenges.map((challenge, index) => {
						const id = getChallengeId(challenge);
						const isCompleting = completingId === id;
						const isCompleted = completedIds.has(id);
						const isCelebrating = celebratingId === id;

						return (
							<motion.div
								key={id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
								transition={{ duration: 0.4, delay: index * 0.1 }}
								layout
							>
								<Card
									className={cn(
										"relative overflow-hidden transition-all duration-300",
										"border-l-4 border-l-transparent",
										"hover:shadow-lg hover:-translate-y-1",
										isCompleted && "opacity-60 border-l-green-500",
										isCelebrating && "border-l-green-500",
										!isCompleted && !isCelebrating && "border-l-pink-500"
									)}
								>
									{/* Celebration Overlay */}
									<AnimatePresence>
										{isCelebrating && (
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 pointer-events-none z-10"
											>
												{/* Confetti-like particles */}
												{["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"].map((particleId, i) => (
													<motion.div
														key={particleId}
														initial={{
															x: "50%",
															y: "50%",
															scale: 0,
														}}
														animate={{
															x: `${20 + Math.random() * 60}%`,
															y: `${20 + Math.random() * 60}%`,
															scale: [0, 1, 0],
															rotate: [0, 360],
														}}
														transition={{
															duration: 1,
															delay: i * 0.05,
														}}
														className={cn(
															"absolute w-2 h-2 rounded-full",
															i % 2 === 0 && "bg-green-400",
															i % 2 === 1 && "bg-emerald-400"
														)}
													/>
												))}
											</motion.div>
										)}
									</AnimatePresence>

									<CardHeader className="pb-2">
										<div className="flex items-center justify-between">
											<CardTitle className="text-lg flex items-center gap-3">
												{/* Status Icon */}
												<AnimatePresence mode="wait">
													{isCompleted || isCelebrating ? (
														<motion.div
															key="completed"
															initial={{ scale: 0, rotate: -180 }}
															animate={{ scale: 1, rotate: 0 }}
															transition={{ type: "spring", stiffness: 200 }}
															className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/30"
														>
															<motion.svg
																initial={{ pathLength: 0 }}
																animate={{ pathLength: 1 }}
																transition={{ duration: 0.3 }}
																className="w-4 h-4 text-white"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={3}
																	d="M5 13l4 4L19 7"
																/>
															</motion.svg>
														</motion.div>
													) : (
														<motion.div
															key="pending"
															initial={{ scale: 0.8 }}
															animate={{ scale: 1 }}
															className="w-8 h-8 rounded-full bg-pink-500/20 border-2 border-pink-500/30 flex items-center justify-center"
														>
															<div className="w-2 h-2 rounded-full bg-pink-500" />
														</motion.div>
													)}
												</AnimatePresence>
												<span className={cn(isCompleted && "line-through text-muted-foreground")}>
													Challenge
												</span>
											</CardTitle>
										</div>
										<CardDescription className="ml-11">
											Created {new Date(challenge.created_at).toLocaleDateString()}
										</CardDescription>
									</CardHeader>

									<CardContent className="space-y-4">
										{/* Challenge Description */}
										<div
											className={cn(
												"p-4 rounded-xl transition-colors",
												"bg-muted/50",
												"border border-border/50",
												isCompleted && "bg-muted/30"
											)}
										>
											<p
												className={cn(
													"text-base leading-relaxed",
													isCompleted && "text-muted-foreground"
												)}
											>
												{challenge.description}
											</p>
										</div>

										{/* Action Area */}
										<AnimatePresence mode="wait">
											{!isCompleted && !isCelebrating && (
												<motion.div
													initial={{ opacity: 0, y: 10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -10 }}
												>
													<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
														<Button
															onClick={() => handleComplete(challenge)}
															disabled={isCompleting}
															className={cn(
																"w-full h-11 font-semibold relative overflow-hidden",
																"bg-pink-500 hover:bg-pink-600",
																"shadow-md hover:shadow-lg",
																"transition-all duration-300",
																"disabled:opacity-50 disabled:cursor-not-allowed"
															)}
														>
															{isCompleting ? (
																<span className="flex items-center gap-2">
																	<motion.div
																		animate={{ rotate: 360 }}
																		transition={{
																			duration: 1,
																			repeat: Number.POSITIVE_INFINITY,
																			ease: "linear",
																		}}
																		className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
																	/>
																	Completing...
																</span>
															) : (
																<span className="flex items-center gap-2">
																	<svg
																		className="w-5 h-5"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M5 13l4 4L19 7"
																		/>
																	</svg>
																	Mark as Complete
																</span>
															)}
														</Button>
													</motion.div>
												</motion.div>
											)}

											{isCelebrating && (
												<motion.div
													initial={{ opacity: 0, scale: 0.9 }}
													animate={{ opacity: 1, scale: 1 }}
													exit={{ opacity: 0, scale: 0.9 }}
													className="flex items-center justify-center gap-2 py-3 text-green-600 dark:text-green-400 font-semibold"
												>
													<motion.span
														animate={{ scale: [1, 1.2, 1] }}
														transition={{ duration: 0.5, repeat: 2 }}
														className="text-2xl"
													>
														🎉
													</motion.span>
													<span>Amazing work!</span>
													<motion.span
														animate={{ scale: [1, 1.2, 1] }}
														transition={{ duration: 0.5, repeat: 2, delay: 0.1 }}
														className="text-2xl"
													>
														🎉
													</motion.span>
												</motion.div>
											)}

											{isCompleted && !isCelebrating && (
												<motion.div
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className="flex items-center justify-center gap-2 py-2 text-green-600 dark:text-green-400 font-medium"
												>
													<svg
														className="w-5 h-5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M5 13l4 4L19 7"
														/>
													</svg>
													Challenge completed!
												</motion.div>
											)}
										</AnimatePresence>
									</CardContent>
								</Card>
							</motion.div>
						);
					})}
				</AnimatePresence>
			</div>
		</div>
	);
}
