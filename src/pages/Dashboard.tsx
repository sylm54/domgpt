import {
	Activity,
	BrainCircuit,
	Calendar,
	Flame,
	MessageSquare,
	Play,
	RefreshCw,
	Repeat,
	Settings,
	Sparkles,
	Target,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { HistoryTimeline } from "@/components/history/HistoryTimeline";
import { useGetHistoryData } from "@/data/history";
import { useLatestHypnoFile } from "@/data/hypno";
import { useProfileStore } from "@/data/profile";
import { useLatestSubliminalFile } from "@/data/subliminal";
import type { HistoryItem } from "@/types/user";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

function isOnboardingCompleted(): boolean {
	return localStorage.getItem("onboardingCompleted") === "true";
}

export function setOnboardingCompleted(completed: boolean) {
	localStorage.setItem("onboardingCompleted", completed ? "true" : "false");
}

export function Dashboard() {
	const { profile } = useProfileStore();
	const navigate = useNavigate();
	const getHistory = useGetHistoryData();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [loadingHypno, setLoadingHypno] = useState(true);
	const [loadingSubliminal, setLoadingSubliminal] = useState(true);
	const hypno = useLatestHypnoFile();
	const subliminal = useLatestSubliminalFile();

	// Calculate statistics from history data
	const stats = useMemo(
		() => ({
			totalSessions: loadingHistory ? 0 : history.filter((item) => item.type === "session").length,
			totalReflections: loadingHistory
				? 0
				: history.filter((item) => item.type === "reflection").length,
			streak: loadingHistory ? 0 : calculateStreak(history),
			lastActivity: loadingHistory
				? "Loading..."
				: history.length > 0
					? getDaysAgo(history[0].time)
					: "Never",
		}),
		[history, loadingHistory]
	);

	useEffect(() => {
		async function loadHistory() {
			try {
				const historyData = await getHistory(50);
				setHistory(historyData);
			} catch (error) {
				console.error("Failed to load history:", error);
			} finally {
				setLoadingHistory(false);
			}
		}
		loadHistory();
	}, [getHistory]);

	useEffect(() => {
		if (hypno !== undefined) {
			setLoadingHypno(false);
		}
	}, [hypno]);

	useEffect(() => {
		if (subliminal !== undefined) {
			setLoadingSubliminal(false);
		}
	}, [subliminal]);

	if (!isOnboardingCompleted()) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="h-full flex items-center justify-center p-4 relative overflow-hidden"
			>
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: "spring", stiffness: 100 }}
				>
					<Card className="max-w-lg w-full border border-primary/20 bg-background rounded-3xl overflow-hidden">
						<CardHeader className="text-center pb-4 pt-8">
							<motion.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
								className="mx-auto mb-6 w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center"
							>
								<Sparkles className="h-12 w-12 text-primary" />
							</motion.div>
							<CardTitle className="text-3xl md:text-4xl font-bold text-primary leading-tight">
								Welcome to
								<br />
								Conditioning Trainer
							</CardTitle>
						</CardHeader>
						<CardContent className="pb-8 px-8">
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
							>
								<motion.button
									type="button"
									onClick={() => navigate("/onboarding")}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-xl"
								>
									<span className="flex items-center justify-center gap-2">
										Start Your Journey
										<Zap className="h-5 w-5" />
									</span>
								</motion.button>
							</motion.div>
						</CardContent>
					</Card>
				</motion.div>
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
			<div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
				{/* Hero Section */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-3xl bg-primary/5 p-8 md:p-12 border border-primary/20 min-h-[200px]"
				>
					<div className="max-w-xl">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 }}
						>
							<span className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-3 bg-primary/10 px-3 py-1 rounded-full">
								<Sparkles className="h-4 w-4" />
								Your Dashboard
							</span>
						</motion.div>
						<h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground leading-tight">
							Welcome Back
						</h1>
					</div>
				</motion.div>

				{/* Statistics Section with decorative title */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-4"
				>
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5 text-primary" />
						<h2 className="text-xl font-bold">Your Progress</h2>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
						{[
							{
								title: "Total Sessions",
								value: stats.totalSessions,
								icon: <Zap className="h-5 w-5" />,
								delay: 0,
							},
							{
								title: "Reflections",
								value: stats.totalReflections,
								icon: <MessageSquare className="h-5 w-5" />,
								delay: 0.05,
							},
							{
								title: "Current Streak",
								value: stats.streak,
								icon: <Flame className="h-5 w-5" />,
								delay: 0.1,
							},
							{
								title: "Last Activity",
								value: stats.lastActivity,
								icon: <Calendar className="h-5 w-5" />,
								delay: 0.15,
								size: "compact" as const,
							},
						].map((stat, index) => (
							<motion.div
								key={stat.title}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 + stat.delay }}
							>
								<StatsCard
									title={stat.title}
									value={stat.value}
									icon={stat.icon}
									trend={
										stat.size
											? undefined
											: {
													value: typeof stat.value === "number" && stat.value > 0 ? 100 : 0,
													direction:
														typeof stat.value === "number" && stat.value > 0 ? "up" : "neutral",
												}
									}
									size={stat.size}
								/>
							</motion.div>
						))}
					</div>
				</motion.div>

				{/* Main Actions Grid */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<div className="flex items-center gap-2 mb-6">
						<Sparkles className="h-5 w-5 text-primary" />
						<h2 className="text-xl font-bold">Quick Actions</h2>
					</div>

					{/* Hypno Feature Card - Full Width */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.25 }}
						className="mb-6"
					>
						<Card className="border border-primary/20 rounded-2xl bg-background">
							<CardContent className="p-6 md:p-8">
								<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
									<div className="p-4 rounded-2xl bg-primary/10">
										<BrainCircuit className="h-10 w-10 text-primary" />
									</div>

									<div className="flex-1">
										<h3 className="text-2xl font-bold mb-2 text-foreground">Hypnosis Session</h3>
										<p className="text-muted-foreground max-w-lg">
											{hypno
												? "Continue your session or generate a new one."
												: "Generate a personalized hypnosis session."}
										</p>
									</div>

									<div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
										{loadingHypno ? (
											<motion.div
												animate={{ rotate: 360 }}
												transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
												className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full"
											/>
										) : hypno ? (
											<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
												<Button
													size="lg"
													onClick={() => navigate(`/hypno/play/${hypno.id.id}`)}
													className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
												>
													<Play className="h-5 w-5 mr-2" />
													Play
												</Button>
											</motion.div>
										) : null}
										<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
											<Button
												size="lg"
												variant="outline"
												onClick={() => navigate("/hypno/new")}
												className="border-primary/30 hover:border-primary/60 hover:bg-primary/5 font-semibold px-6"
											>
												<RefreshCw className="h-5 w-5 mr-2" />
												{hypno ? "Regenerate" : "Generate New"}
											</Button>
										</motion.div>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* Subliminal Feature Card - Full Width */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="mb-6"
					>
						<Card className="border border-primary/20 rounded-2xl bg-background">
							<CardContent className="p-6 md:p-8">
								<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
									<div className="p-4 rounded-2xl bg-primary/10">
										<Repeat className="h-10 w-10 text-primary" />
									</div>

									<div className="flex-1">
										<h3 className="text-2xl font-bold mb-2 text-foreground">Subliminal Session</h3>
										<p className="text-muted-foreground max-w-lg">
											{subliminal
												? "Continue your loopable subliminal or generate a new one."
												: "Generate a loopable subliminal for sleep or background listening."}
										</p>
									</div>

									<div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
										{loadingSubliminal ? (
											<motion.div
												animate={{ rotate: 360 }}
												transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
												className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full"
											/>
										) : subliminal ? (
											<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
												<Button
													size="lg"
													onClick={() => navigate(`/subliminal/play/${subliminal.id.id}`)}
													className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
												>
													<Play className="h-5 w-5 mr-2" />
													Play
												</Button>
											</motion.div>
										) : null}
										<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
											<Button
												size="lg"
												variant="outline"
												onClick={() => navigate("/subliminal/new")}
												className="border-primary/30 hover:border-primary/60 hover:bg-primary/5 font-semibold px-6"
											>
												<RefreshCw className="h-5 w-5 mr-2" />
												{subliminal ? "Regenerate" : "Generate New"}
											</Button>
										</motion.div>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					{/* Other Quick Actions */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{[
							{
								onClick: () => navigate("/coach"),
								title: "Chat with Coach",
								description: "Get personalized guidance",
								variant: "outline" as const,
								icon: <MessageSquare className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/challenges"),
								title: "Daily Challenges",
								description: "Complete real-world tasks",
								variant: "outline" as const,
								icon: <Target className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/reflection"),
								title: "Reflection",
								description: "Assess your progress",
								variant: "outline" as const,
								icon: <Activity className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/settings"),
								title: "Settings",
								description: "Configure your preferences and manage data",
								variant: "outline" as const,
								icon: <Settings className="h-6 w-6" />,
							},
						].map((action, index) => (
							<motion.div
								key={action.title}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 + index * 0.05 }}
							>
								<QuickActionButton
									onClick={action.onClick}
									title={action.title}
									description={action.description}
									variant={action.variant}
									icon={action.icon}
								/>
							</motion.div>
						))}
					</div>
				</motion.div>

				{profile.plan && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<Card className="border border-primary/20 rounded-2xl bg-background">
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-xl bg-primary/10">
										<Sparkles className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-xl">Current Conditioning Plan</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
									<p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
										<Target className="h-4 w-4" />
										Plan Focus
									</p>
									<p className="text-base font-medium leading-relaxed">{profile.plan.user}</p>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
				>
					<div className="flex items-center gap-2 mb-6">
						<div className="p-1.5 rounded-lg bg-primary/10">
							<Activity className="h-5 w-5 text-primary" />
						</div>
						<h2 className="text-xl font-bold">Journey History</h2>
					</div>

					<Card className="border border-primary/10 rounded-2xl">
						<CardContent className="p-6">
							{loadingHistory ? (
								<div className="flex flex-col items-center justify-center py-12">
									<motion.div
										animate={{ rotate: 360 }}
										transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
										className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full mb-4"
									/>
									<p className="text-muted-foreground">Loading your history...</p>
								</div>
							) : history.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12">
									<Activity className="h-12 w-12 text-muted-foreground mb-4" />
									<p className="text-muted-foreground font-medium">No history yet</p>
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
