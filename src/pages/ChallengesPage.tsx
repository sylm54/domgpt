import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLLMModel, useSettingsStore } from "@/data/settings";
import type { Challenge } from "@/types/user";
import { ChallengeGenerator, ChallengeList } from "../components/challenge";

export function ChallengesPage() {
	const { settings } = useSettingsStore();
	const navigate = useNavigate();
	const model = settings.main_model ? getLLMModel(settings.llm_engines, settings.main_model) : null;
	const [refreshKey, setRefreshKey] = useState(0);

	const handleChallengesGenerated = (challenges: Challenge[]) => {
		console.log(`${challenges.length} challenges generated`);
		setRefreshKey((k) => k + 1);
	};

	return (
		<div className="h-full overflow-auto">
			{/* Back button */}
			<div className="px-6 pt-4">
				<Button variant="ghost" size="sm" onClick={() => navigate("/")}>
					<ArrowLeft className="h-4 w-4 mr-1" />
					Back
				</Button>
			</div>

			{/* Hero Section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
				className="relative overflow-hidden border-b border-primary/20"
			>
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
							className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full border border-primary/20 text-primary text-sm font-medium"
						>
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
							</span>
							Daily Training Mode
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">Daily Challenges</h1>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							Transform your goals into actionable micro-challenges.
							<span className="block mt-1 text-primary/80 font-medium">
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
								<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
									<svg
										className="w-4 h-4 text-primary-foreground"
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
								<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
									<svg
										className="w-4 h-4 text-primary-foreground"
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
						</div>
						<ChallengeList refreshKey={refreshKey} />
					</motion.div>
				</div>
			</div>
		</div>
	);
}
