import { motion } from "motion/react";
import { useState } from "react";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/types/user";
import { ChallengeGenerator, ChallengeList } from "../components/challenge";

export function ChallengesPage() {
	const { settings } = useSettingsStore();
	const model = getLLMModel(settings.llm_engine, settings.main_model || "x-ai/grok-4.1-fast");
	const [refreshKey, setRefreshKey] = useState(0);

	const handleChallengesGenerated = (challenges: Challenge[]) => {
		console.log(`${challenges.length} challenges generated`);
		setRefreshKey((k) => k + 1);
	};

	return (
		<div className="h-full overflow-auto">
			{/* Hero Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="relative overflow-hidden bg-gradient-to-br from-pink-500/10 via-fuchsia-500/5 to-purple-500/10 border-b border-pink-500/20"
			>
				{/* Decorative Elements */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-full blur-3xl" />
					<div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-purple-500/15 to-pink-500/15 rounded-full blur-3xl" />
					<motion.div
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.3, 0.5, 0.3],
						}}
						transition={{
							duration: 4,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
						}}
						className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-radial from-pink-400/10 to-transparent rounded-full"
					/>
				</div>

				{/* Hero Content */}
				<div className="relative px-6 py-12 md:py-16">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.1 }}
						className="max-w-4xl mx-auto text-center"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 text-sm font-medium"
						>
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
							</span>
							Daily Training Mode
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent mb-3">
							Daily Challenges
						</h1>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Transform your goals into actionable micro-challenges.
							<span className="block mt-1 text-pink-600/80 dark:text-pink-400/80 font-medium">
								Small steps, big transformations.
							</span>
						</p>
					</motion.div>
				</div>
			</motion.div>

			{/* Main Content */}
			<div className="p-6 max-w-7xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Generator Section */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
					>
						{/* Section Header */}
						<div className="flex items-center gap-3 mb-4">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
									<svg
										className="w-4 h-4 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								</div>
								<h2 className="text-lg font-semibold">Generate</h2>
							</div>
							<div className="flex-1 h-px bg-gradient-to-r from-pink-500/50 to-transparent" />
						</div>
						<ChallengeGenerator model={model} onChallengesGenerated={handleChallengesGenerated} />
					</motion.div>

					{/* List Section */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.4 }}
					>
						{/* Section Header */}
						<div className="flex items-center gap-3 mb-4">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/25">
									<svg
										className="w-4 h-4 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
										/>
									</svg>
								</div>
								<h2 className="text-lg font-semibold">Your Challenges</h2>
							</div>
							<div className="flex-1 h-px bg-gradient-to-r from-fuchsia-500/50 to-transparent" />
						</div>
						<ChallengeList refreshKey={refreshKey} />
					</motion.div>
				</div>
			</div>
		</div>
	);
}
