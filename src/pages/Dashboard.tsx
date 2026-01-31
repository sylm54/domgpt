import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useLatestHypnoFile } from "@/data/hypno";
import { useResetDatabase } from "@/data/surreal";
import { useProfileStore } from "@/data/profile";
import { useGetHistoryData } from "@/data/history";
import type { HistoryItem } from "@/types/user";
import { HistoryTimeline } from "@/components/history/HistoryTimeline";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
	Zap,
	MessageSquare,
	Trophy,
	Target,
	BrainCircuit,
	Sparkles,
	Activity,
	Flame,
	Calendar,
} from "lucide-react";
import { MarkdownText } from "@/components/markdown-text";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

function isOnboardingCompleted(): boolean {
	return localStorage.getItem("onboardingCompleted") === "true";
}

export function setOnboardingCompleted(completed: boolean) {
	localStorage.setItem("onboardingCompleted", completed ? "true" : "false");
}

export function Dashboard() {
	const resetDatabase = useResetDatabase();
	const { profile } = useProfileStore();
	const navigate = useNavigate();
	const getHistory = useGetHistoryData();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const hypno = useLatestHypnoFile();

	// Calculate statistics from history data
	const stats = {
		totalSessions: history.filter((item) => item.type === "session").length,
		totalReflections: history.filter((item) => item.type === "reflection").length,
		streak: calculateStreak(history),
		lastActivity: history.length > 0 ? getDaysAgo(history[0].time) : "Never",
	};

	useEffect(() => {
		async function loadHistory() {
			try {
				const historyData = await getHistory(50);
				setHistory(historyData);
			} catch (error) {
				console.error("Failed to load history:", error);
			} finally {
				setLoading(false);
			}
		}
		loadHistory();
	}, [getHistory]);

	if (!isOnboardingCompleted()) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="h-full flex items-center justify-center p-4"
			>
				<Card className="max-w-md w-full border-2 border-primary/20 shadow-2xl">
					<CardHeader className="text-center pb-4">
						<motion.div
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
							className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
						>
							<Sparkles className="h-10 w-10 text-primary" />
						</motion.div>
						<CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
							Welcome to Conditioning Trainer
						</CardTitle>
						<p className="text-base text-muted-foreground">
							Complete onboarding to begin your personalized conditioning journey
						</p>
					</CardHeader>
					<CardContent>
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
						>
							<button
								type="button"
								onClick={() => navigate("/onboarding")}
								className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							>
								Start Your Journey
							</button>
						</motion.div>
					</CardContent>
				</Card>
			</motion.div>
		);
	}

	if (!profile) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="h-full flex items-center justify-center p-4"
			>
				<div className="flex flex-col items-center gap-4">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
						className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
					/>
					<p className="text-muted-foreground font-medium">Loading your dashboard...</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4 }}
			className="h-full overflow-auto scroll-smooth"
		>
			<div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
				{/* Header with gradient background */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6 md:p-8 border border-primary/20"
				>
					{/* Decorative elements */}
					<div className="absolute inset-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
					<div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

					{/* Content */}
					<div className="relative z-10">
						<h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							Welcome Back
						</h1>
						<p className="text-muted-foreground text-lg">
							Continue your conditioning journey with progress and insights
						</p>
					</div>
				</motion.div>

				{/* Statistics Cards */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="grid grid-cols-2 md:grid-cols-4 gap-4"
				>
					<StatsCard
						title="Total Sessions"
						value={stats.totalSessions}
						icon={<Zap className="h-5 w-5" />}
						trend={{
							value: stats.totalSessions > 0 ? 100 : 0,
							direction: stats.totalSessions > 0 ? "up" : "neutral",
						}}
					/>
					<StatsCard
						title="Reflections"
						value={stats.totalReflections}
						icon={<MessageSquare className="h-5 w-5" />}
						trend={{
							value: stats.totalReflections > 0 ? 100 : 0,
							direction: stats.totalReflections > 0 ? "up" : "neutral",
						}}
					/>
					<StatsCard
						title="Current Streak"
						value={stats.streak}
						icon={<Flame className="h-5 w-5" />}
						trend={{
							value: stats.streak > 0 ? 100 : 0,
							direction: stats.streak > 0 ? "up" : "neutral",
						}}
					/>
					<StatsCard
						title="Last Activity"
						value={stats.lastActivity}
						icon={<Calendar className="h-5 w-5" />}
						size="compact"
					/>
				</motion.div>

				{/* Quick Actions */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<h2 className="text-xl font-bold mb-4 flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-primary" />
						Quick Actions
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{hypno && (
							<QuickActionButton
								onClick={() => navigate(`/hypno/play/${hypno.id.id}`)}
								title="Continue Last Session"
								description="Resume where you left off in your last hypnosis session"
								variant="default"
								icon={<BrainCircuit className="h-6 w-6" />}
							/>
						)}
						<QuickActionButton
							onClick={() => navigate("/hypno/new")}
							title="New Hypnosis Session"
							description="Generate a personalized hypnosis session for your goals"
							variant="outline"
							icon={<Zap className="h-6 w-6" />}
						/>
						<QuickActionButton
							onClick={() => navigate("/coach")}
							title="Chat with Coach"
							description="Review your progress and get personalized guidance"
							variant="outline"
							icon={<MessageSquare className="h-6 w-6" />}
						/>
						<QuickActionButton
							onClick={() => navigate("/challenges")}
							title="Daily Challenges"
							description="Complete real-world conditioning tasks to reinforce learning"
							variant="outline"
							icon={<Target className="h-6 w-6" />}
						/>
						<QuickActionButton
							onClick={() => navigate("/reflection")}
							title="Reflection"
							description="Assess your conditioning progress and insights"
							variant="outline"
							icon={<Activity className="h-6 w-6" />}
						/>
						<QuickActionButton
							onClick={() => {
								resetDatabase().then(() => {
									setOnboardingCompleted(false);
									navigate("/onboarding");
								});
							}}
							title="Reset All Data"
							description="Start fresh with a new onboarding experience"
							variant="destructive"
							icon={<Trophy className="h-6 w-6" />}
						/>
					</div>
				</motion.div>

				{/* Current Plan */}
				{profile.plan && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<Card className="border-2 border-primary/20 overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
							<CardHeader className="relative">
								<div className="flex items-center gap-2">
									<Sparkles className="h-5 w-5 text-primary" />
									<CardTitle className="text-xl">Current Conditioning Plan</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="relative space-y-3">
								<div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
									<p className="text-sm font-semibold text-primary mb-1">Plan Focus</p>
									<p className="text-base font-medium">{profile.plan.user}</p>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}

				{/* History Timeline */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					<h2 className="text-xl font-bold mb-4 flex items-center gap-2">
						<Activity className="h-5 w-5 text-primary" />
						Journey History
					</h2>
					<Card className="border-2 border-primary/10 overflow-hidden">
						<CardContent className="p-6">
							{loading ? (
								<div className="flex flex-col items-center justify-center py-12">
									<motion.div
										animate={{ rotate: 360 }}
										transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
										className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full mb-4"
									/>
									<p className="text-muted-foreground">Loading your history...</p>
								</div>
							) : (
								<HistoryTimeline history={history} />
							)}
						</CardContent>
					</Card>
				</motion.div>
			</div>
		</motion.div>
	);
}

// Helper functions for statistics
function calculateStreak(history: HistoryItem[]): number {
	if (history.length === 0) return 0;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	let streak = 0;
	let currentDate = new Date(today);

	for (const item of history) {
		const itemDate = new Date(item.time);
		itemDate.setHours(0, 0, 0, 0);

		const daysDiff = Math.floor(
			(currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (daysDiff === 1) {
			streak++;
			currentDate = new Date(itemDate);
		} else if (daysDiff > 1) {
			break;
		}
	}

	return streak;
}

function getDaysAgo(date: Date): string {
	const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
	return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
}
