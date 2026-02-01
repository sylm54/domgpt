import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
	Activity,
	BrainCircuit,
	Calendar,
	Flame,
	MessageSquare,
	Sparkles,
	Target,
	Trophy,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuickActionButton } from "@/components/dashboard/QuickActionButton";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { HistoryTimeline } from "@/components/history/HistoryTimeline";
import { MarkdownText } from "@/components/markdown-text";
import { useGetHistoryData } from "@/data/history";
import { useLatestHypnoFile } from "@/data/hypno";
import { useProfileStore } from "@/data/profile";
import { useResetDatabase } from "@/data/surreal";
import type { HistoryItem } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

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
				className="h-full flex items-center justify-center p-4 relative overflow-hidden"
			>
				{/* Background mesh pattern */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
				<div className="absolute inset-0 opacity-30">
					<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
					<div
						className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse"
						style={{ animationDelay: "1s" }}
					/>
				</div>

				{/* Floating geometric elements */}
				<motion.div
					animate={{
						y: [0, -20, 0],
						rotate: [0, 5, 0],
					}}
					transition={{
						duration: 6,
						repeat: Infinity,
						ease: "easeInOut",
					}}
					className="absolute top-20 right-20 w-24 h-24 border border-primary/20 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-sm"
				/>
				<motion.div
					animate={{
						y: [0, 15, 0],
						rotate: [0, -5, 0],
					}}
					transition={{
						duration: 5,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 0.5,
					}}
					className="absolute bottom-32 left-16 w-16 h-16 border border-accent/20 rounded-xl bg-gradient-to-br from-accent/10 to-transparent backdrop-blur-sm"
				/>

				{/* Glowing Welcome Card */}
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ type: "spring", stiffness: 100 }}
					className="relative"
				>
					{/* Glow effect */}
					<div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-3xl blur-lg opacity-50 animate-pulse" />

					<Card className="relative max-w-lg w-full border-2 border-primary/30 shadow-2xl bg-background/95 backdrop-blur-xl rounded-3xl overflow-hidden">
						{/* Inner decorative elements */}
						<div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
						<div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

						{/* Animated corner accents */}
						<motion.div
							animate={{ opacity: [0.3, 0.6, 0.3] }}
							transition={{ duration: 2, repeat: Infinity }}
							className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/40 rounded-tl-lg"
						/>
						<motion.div
							animate={{ opacity: [0.3, 0.6, 0.3] }}
							transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
							className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-accent/40 rounded-br-lg"
						/>

						<CardHeader className="text-center pb-4 pt-8 relative z-10">
							<motion.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
								className="mx-auto mb-6 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 flex items-center justify-center shadow-lg shadow-primary/20 border border-primary/20"
							>
								<motion.div
									animate={{ rotate: [0, 360] }}
									transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
								>
									<Sparkles className="h-12 w-12 text-primary" />
								</motion.div>
							</motion.div>
							<CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-transparent leading-tight">
								Welcome to
								<br />
								Conditioning Trainer
							</CardTitle>
							<p className="text-lg text-muted-foreground mt-4 max-w-sm mx-auto">
								Complete onboarding to begin your personalized conditioning journey
							</p>
						</CardHeader>
						<CardContent className="pb-8 px-8 relative z-10">
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
									className="relative w-full h-16 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground font-bold text-xl shadow-lg shadow-primary/30 overflow-hidden group"
								>
									{/* Button glow on hover */}
									<div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
									<span className="relative z-10 flex items-center justify-center gap-2">
										Start Your Journey
										<motion.span
											animate={{ x: [0, 4, 0] }}
											transition={{ duration: 1.5, repeat: Infinity }}
										>
											<Zap className="h-5 w-5" />
										</motion.span>
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
				{/* Hero Section with dramatic gradient background */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-background to-accent/10 p-8 md:p-12 border border-primary/20 min-h-[200px]"
				>
					{/* Mesh-like pattern background */}
					<div className="absolute inset-0 opacity-30">
						<div
							className="absolute inset-0"
							style={{
								backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.3) 0%, transparent 50%),
											  radial-gradient(circle at 75% 75%, hsl(var(--accent) / 0.3) 0%, transparent 50%),
											  radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)`,
							}}
						/>
					</div>

					{/* Decorative gradient orbs */}
					<div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/30 via-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
					<div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-accent/25 via-accent/10 to-transparent rounded-full blur-3xl translate-y-1/2 pointer-events-none" />
					<div className="absolute top-1/2 right-1/4 w-48 h-48 bg-gradient-to-l from-primary/20 to-transparent rounded-full blur-2xl pointer-events-none" />

					{/* Geometric decoration on the right */}
					<div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
						<motion.div
							animate={{
								y: [0, -15, 0],
								rotate: [0, 5, 0],
							}}
							transition={{
								duration: 6,
								repeat: Infinity,
								ease: "easeInOut",
							}}
							className="relative"
						>
							<div className="w-32 h-32 border-2 border-primary/20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/5 backdrop-blur-sm" />
							<div className="absolute -top-4 -right-4 w-16 h-16 border border-accent/30 rounded-2xl bg-gradient-to-br from-accent/10 to-transparent" />
							<div className="absolute -bottom-6 -left-6 w-20 h-20 border border-primary/20 rounded-2xl bg-gradient-to-tr from-primary/10 to-transparent" />
						</motion.div>
					</div>

					{/* Floating animated element */}
					<motion.div
						animate={{
							y: [0, -10, 0],
							x: [0, 5, 0],
						}}
						transition={{
							duration: 4,
							repeat: Infinity,
							ease: "easeInOut",
						}}
						className="absolute top-6 right-1/3 w-8 h-8 bg-gradient-to-br from-primary/40 to-accent/40 rounded-lg blur-sm"
					/>

					{/* Content - Asymmetric layout offset to the left */}
					<div className="relative z-10 max-w-xl">
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
						<h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent leading-tight">
							Welcome Back
						</h1>
						<p className="text-muted-foreground text-lg md:text-xl max-w-md">
							Continue your conditioning journey with progress and insights
						</p>
					</div>
				</motion.div>

				{/* Statistics Section with decorative title */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-4"
				>
					{/* Section title with decorative line */}
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Activity className="h-5 w-5 text-primary" />
							<h2 className="text-xl font-bold">Your Progress</h2>
						</div>
						<div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
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

				{/* Decorative divider before Quick Actions */}
				<div className="relative py-2">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
					</div>
					<div className="relative flex justify-center">
						<div className="bg-background px-4">
							<div className="w-2 h-2 rounded-full bg-primary/30" />
						</div>
					</div>
				</div>

				{/* Quick Actions with stagger animation */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					<div className="flex items-center gap-4 mb-6">
						<div className="flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-primary" />
							<h2 className="text-xl font-bold">Quick Actions</h2>
						</div>
						<div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{[
							hypno && {
								onClick: () => navigate(`/hypno/play/${hypno.id.id}`),
								title: "Continue Last Session",
								description: "Resume where you left off in your last hypnosis session",
								variant: "default" as const,
								icon: <BrainCircuit className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/hypno/new"),
								title: "New Hypnosis Session",
								description: "Generate a personalized hypnosis session for your goals",
								variant: "outline" as const,
								icon: <Zap className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/coach"),
								title: "Chat with Coach",
								description: "Review your progress and get personalized guidance",
								variant: "outline" as const,
								icon: <MessageSquare className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/challenges"),
								title: "Daily Challenges",
								description: "Complete real-world conditioning tasks to reinforce learning",
								variant: "outline" as const,
								icon: <Target className="h-6 w-6" />,
							},
							{
								onClick: () => navigate("/reflection"),
								title: "Reflection",
								description: "Assess your conditioning progress and insights",
								variant: "outline" as const,
								icon: <Activity className="h-6 w-6" />,
							},
							{
								onClick: () => {
									resetDatabase().then(() => {
										setOnboardingCompleted(false);
										navigate("/onboarding");
									});
								},
								title: "Reset All Data",
								description: "Start fresh with a new onboarding experience",
								variant: "destructive" as const,
								icon: <Trophy className="h-6 w-6" />,
							},
						]
							.filter(Boolean)
							.map((action, index) => (
								<motion.div
									key={action!.title}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 + index * 0.05 }}
								>
									<QuickActionButton
										onClick={action!.onClick}
										title={action!.title}
										description={action!.description}
										variant={action!.variant}
										icon={action!.icon}
									/>
								</motion.div>
							))}
					</div>
				</motion.div>

				{/* Current Plan with gradient border glow effect */}
				{profile.plan && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="relative"
					>
						{/* Gradient border glow */}
						<div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 rounded-2xl blur opacity-30" />

						<Card className="relative border-2 border-primary/20 overflow-hidden rounded-2xl bg-background/95 backdrop-blur-sm">
							{/* Background decoration */}
							<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
							<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

							<CardHeader className="relative">
								<div className="flex items-center gap-3">
									<div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
										<Sparkles className="h-5 w-5 text-primary" />
									</div>
									<CardTitle className="text-xl">Current Conditioning Plan</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="relative space-y-3">
								<div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 backdrop-blur-sm">
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

				{/* History Timeline with visual polish */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.4 }}
					className="relative"
				>
					{/* Section header with decorative elements */}
					<div className="flex items-center gap-4 mb-6">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-primary/10">
								<Activity className="h-5 w-5 text-primary" />
							</div>
							<h2 className="text-xl font-bold">Journey History</h2>
						</div>
						<div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
						<div className="hidden sm:flex items-center gap-1">
							{["dot-1", "dot-2", "dot-3"].map((id, i) => (
								<motion.div
									key={id}
									animate={{ opacity: [0.3, 0.6, 0.3] }}
									transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
									className="w-1.5 h-1.5 rounded-full bg-primary/40"
								/>
							))}
						</div>
					</div>

					<Card className="relative border-2 border-primary/10 overflow-hidden rounded-2xl">
						{/* Subtle background decoration */}
						<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
						<div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
						<div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-accent/10 to-transparent rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

						<CardContent className="p-6 relative">
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
